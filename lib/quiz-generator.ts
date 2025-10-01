// lib/quiz-generator.ts - Final corrected version

import { prisma } from "./prisma";
import OpenAI from "openai";

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
}

export class TranscriptQuizGenerator {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Main method: Generate AND save quiz questions from video
   * This method handles everything - generation, validation, and database persistence
   */
  async generateQuizFromVideo(
    videoId: string,
    regenerate = false
  ): Promise<QuizQuestion[]> {
    // Fetch video with all necessary data
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        transcript: true,
        tests: true,
        course: {
          select: {
            title: true,
            category: true,
            level: true,
            description: true,
          },
        },
      },
    });

    if (!video) {
      throw new Error("Video not found");
    }

    // If quiz already exists and not regenerating, return existing
    if (video.tests && video.tests.length > 0 && !regenerate) {
      console.log("Quiz already exists, returning existing questions");
      return video.tests.map((test) => ({
        question: test.question,
        options: test.options as string[],
        correct: test.correct,
        explanation: test.explanation,
        difficulty: test.difficulty as "easy" | "medium" | "hard",
        points: test.points || 10,
      }));
    }

    // Check if we have a usable transcript
    const hasTranscript =
      video.transcript?.status === "COMPLETED" &&
      video.transcript.content &&
      video.transcript.content.length > 100;

    let questions: QuizQuestion[];

    // Generate questions from appropriate source
    if (hasTranscript) {
      console.log("Generating quiz from transcript");
      questions = await this.generateFromTranscript(
        video,
        video.transcript!.content
      );
    } else {
      console.log("No transcript available, generating from topic");
      questions = await this.generateFromTopic(video);
    }

    // Save to database in a transaction
    await this.saveQuestionsToDatabase(videoId, questions, regenerate);

    return questions;
  }

  /**
   * Save generated questions to database
   * Uses transaction to ensure atomicity
   */
  private async saveQuestionsToDatabase(
    videoId: string,
    questions: QuizQuestion[],
    regenerate: boolean
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // If regenerating, delete existing questions first
        if (regenerate) {
          await tx.test.deleteMany({
            where: { videoId },
          });
          console.log(`Deleted existing questions for video ${videoId}`);
        }

        // Create all new questions
        await tx.test.createMany({
          data: questions.map((question, index) => ({
            videoId,
            question: question.question,
            options: question.options,
            correct: question.correct,
            explanation: question.explanation,
            difficulty: question.difficulty,
            points: question.points,
            order: index,
          })),
        });
      });

      console.log(
        `Successfully saved ${questions.length} questions to database for video ${videoId}`
      );
    } catch (error) {
      console.error("Error saving questions to database:", error);
      throw new Error("Failed to save quiz questions to database");
    }
  }

  /**
   * Generate questions from video transcript using AI
   */
  private async generateFromTranscript(
    video: any,
    transcriptContent: string
  ): Promise<QuizQuestion[]> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    // Truncate transcript if too long (keep within token limits)
    const maxTranscriptLength = 12000; // ~3000 tokens
    const truncatedTranscript =
      transcriptContent.length > maxTranscriptLength
        ? transcriptContent.substring(0, maxTranscriptLength) + "..."
        : transcriptContent;

    const prompt = this.buildProfessionalPrompt(video, truncatedTranscript);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert educational content creator and instructional designer specializing in creating high-quality, pedagogically sound assessment questions. Your questions should:

1. Test genuine understanding, not just memorization
2. Use clear, unambiguous language
3. Have one definitively correct answer
4. Include plausible distractors that reveal common misconceptions
5. Cover different cognitive levels (remember, understand, apply, analyze)
6. Be directly based on the content provided
7. Include detailed explanations that reinforce learning

Create questions that a professional educator would be proud to use in their course.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const result = JSON.parse(content);

      // Validate and normalize the questions
      const validatedQuestions = this.validateAndNormalizeQuestions(
        result.questions || []
      );

      if (validatedQuestions.length === 0) {
        throw new Error("No valid questions generated from transcript");
      }

      return validatedQuestions;
    } catch (error) {
      console.error("Error generating quiz from transcript:", error);
      // Fallback to topic-based generation
      console.log("Falling back to topic-based generation");
      return this.generateFromTopic(video);
    }
  }

  /**
   * Build the AI prompt for transcript-based generation
   */
  private buildProfessionalPrompt(video: any, transcript: string): string {
    const courseContext = video.course
      ? `
**Course Context:**
- Course: ${video.course.title}
- Category: ${video.course.category}
- Level: ${video.course.level}
- Description: ${video.course.description || "N/A"}
`
      : "";

    const questionCount = this.determineQuestionCount(transcript);

    return `${courseContext}

**Video Information:**
- Title: ${video.title}
- Description: ${video.description || "N/A"}
${video.aiPrompt ? `- Learning Objectives: ${video.aiPrompt}` : ""}

**Video Transcript:**
${transcript}

---

Based on the video transcript above, generate exactly ${questionCount} professional, high-quality multiple-choice quiz questions that:

**Question Design Principles:**
1. **Test Understanding, Not Memorization**: Focus on conceptual understanding, application, and analysis
2. **Clear and Precise**: Use unambiguous language that students can easily understand
3. **One Correct Answer**: Ensure only one option is definitively correct
4. **Plausible Distractors**: Wrong answers should be believable and reveal common misconceptions
5. **Appropriate Difficulty Distribution**:
   ${this.getDifficultyDistribution(questionCount)}

**Question Formats to Use:**
- Direct knowledge questions about key concepts
- Scenario-based application questions
- "Which of the following best describes..." questions
- Cause-and-effect reasoning questions
- Comparison questions between related concepts
- Problem-solving questions requiring application

**Requirements:**
- Generate exactly ${questionCount} questions (no more, no less)
- Each question must have exactly 4 options (A, B, C, D)
- Each question must include a detailed explanation (2-3 sentences) that:
  * Explains why the correct answer is right
  * Clarifies common misconceptions
  * Reinforces the learning objective
- Questions should cover different parts of the video content
- Avoid "all of the above" or "none of the above" options
- Use concrete examples from the video when possible

**Output Format (JSON):**
{
  "questions": [
    {
      "question": "Clear, specific question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Detailed explanation covering why the correct answer is right and what students should learn",
      "difficulty": "easy|medium|hard",
      "points": 10
    }
  ]
}

Generate exactly ${questionCount} questions following these guidelines. Ensure professional quality suitable for a formal educational assessment.`;
  }

  /**
   * Determine appropriate number of questions based on content length
   */
  private determineQuestionCount(transcript: string): number {
    const contentLength = transcript.length;

    // Short content (< 2000 chars): 3 questions minimum
    if (contentLength < 2000) {
      return 3;
    }
    // Medium content (2000-5000 chars): 4 questions
    else if (contentLength < 5000) {
      return 4;
    }
    // Long content (5000+ chars): 5 questions maximum
    else {
      return 5;
    }
  }

  /**
   * Get difficulty distribution description based on question count
   */
  private getDifficultyDistribution(count: number): string {
    switch (count) {
      case 3:
        return "- 1 Easy question (foundational concepts, definitions)\n   - 1 Medium question (understanding relationships, applying concepts)\n   - 1 Hard question (analysis, synthesis, problem-solving)";
      case 4:
        return "- 2 Easy questions (foundational concepts, definitions)\n   - 1 Medium question (understanding relationships, applying concepts)\n   - 1 Hard question (analysis, synthesis, problem-solving)";
      case 5:
      default:
        return "- 2 Easy questions (foundational concepts, definitions)\n   - 2 Medium questions (understanding relationships, applying concepts)\n   - 1 Hard question (analysis, synthesis, problem-solving)";
    }
  }

  /**
   * Fallback: Generate questions from topic when no transcript available
   */
  private async generateFromTopic(video: any): Promise<QuizQuestion[]> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    const topicPrompt = `
**Video Title:** ${video.title}
**Description:** ${video.description || "N/A"}
**Learning Content:** ${video.aiPrompt || video.description || video.title}
${video.course ? `**Course:** ${video.course.title} (${video.course.category})` : ""}

Based on the information above, generate 3 professional multiple-choice quiz questions about this topic.

Follow these guidelines:
- 1 Easy question (basic concepts and definitions)
- 1 Medium question (understanding and application)
- 1 Hard question (analysis or problem-solving)
- Each question has exactly 4 options
- Include detailed explanations (2-3 sentences each)
- Test conceptual understanding, not just memorization

Output in JSON format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "Detailed explanation",
      "difficulty": "easy|medium|hard",
      "points": 10
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert educational content creator. Generate professional, pedagogically sound quiz questions.",
          },
          {
            role: "user",
            content: topicPrompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const result = JSON.parse(content);
      return this.validateAndNormalizeQuestions(result.questions || []);
    } catch (error) {
      console.error("Error generating quiz from topic:", error);
      throw new Error("Failed to generate quiz questions");
    }
  }

  /**
   * Validate and normalize questions to ensure consistency
   */
  private validateAndNormalizeQuestions(questions: any[]): QuizQuestion[] {
    return questions
      .filter((q) => {
        // Validate required fields
        return (
          q.question &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correct === "number" &&
          q.correct >= 0 &&
          q.correct < 4 &&
          q.explanation
        );
      })
      .map((q) => ({
        question: q.question.trim(),
        options: q.options.map((opt: string) => opt.trim()),
        correct: q.correct,
        explanation: q.explanation.trim(),
        difficulty: this.normalizeDifficulty(q.difficulty),
        points: this.calculatePoints(q.difficulty),
      }));
  }

  /**
   * Normalize difficulty to valid values
   */
  private normalizeDifficulty(
    difficulty: string
  ): "easy" | "medium" | "hard" {
    const lower = difficulty?.toLowerCase();
    if (lower === "easy" || lower === "beginner") return "easy";
    if (lower === "hard" || lower === "advanced" || lower === "difficult")
      return "hard";
    return "medium";
  }

  /**
   * Calculate points based on difficulty
   */
  private calculatePoints(difficulty: string): number {
    const diff = this.normalizeDifficulty(difficulty);
    switch (diff) {
      case "easy":
        return 10;
      case "medium":
        return 15;
      case "hard":
        return 20;
      default:
        return 10;
    }
  }
}