"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { 
  Code, 
  Terminal, 
  Play, 
  X, 
  Settings, 
  Copy, 
  Download,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import Draggable from "react-draggable";
interface CompilerTabProps {
  setActiveTab: (tab: any) => void;
}
interface ExecutionResult {
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  status: {
    id: number;
    description: string;
  };
  time: string;
  memory: number;
}
const LANGUAGE_CONFIGS = {
  javascript: {
    id: 63,
    name: "JavaScript (Node.js 12.14.0)",
    extension: "js",
    defaultCode: `// JavaScript Code
console.log("Hello, World!");
// You can write your JavaScript code here
const greeting = "Welcome to the compiler!";
console.log(greeting);`
  },
  python: {
    id: 71,
    name: "Python (3.8.1)",
    extension: "py",
    defaultCode: `# Python Code
print("Hello, World!")
# You can write your Python code here
greeting = "Welcome to the compiler!"
print(greeting)`
  },
  java: {
    id: 62,
    name: "Java (OpenJDK 13.0.1)",
    extension: "java",
    defaultCode: `// Java Code
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // You can write your Java code here
        String greeting = "Welcome to the compiler!";
        System.out.println(greeting);
    }
}`
  },
  cpp: {
    id: 54,
    name: "C++ (GCC 9.2.0)",
    extension: "cpp",
    defaultCode: `// C++ Code
#include <iostream>
#include <string>
int main() {
    std::cout << "Hello, World!" << std::endl;
    
    // You can write your C++ code here
    std::string greeting = "Welcome to the compiler!";
    std::cout << greeting << std::endl;
    
    return 0;
}`
  }
};
export function CompilerTab({ setActiveTab }: CompilerTabProps) {
  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState<string>("javascript");
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFloating, setIsFloating] = useState<boolean>(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(14);
  const [executionTime, setExecutionTime] = useState<string>("");
  const [memoryUsed, setMemoryUsed] = useState<string>("");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  const outputRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  // Initialize with default code for selected language
  useEffect(() => {
    setCode(LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS].defaultCode);
  }, [language]);
  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);
  const runCode = async () => {
    if (!code.trim()) {
      setOutput("Error: Please write some code before running.");
      return;
    }
    setIsRunning(true);
    setOutput("🚀 Compiling and running your code...\n");
    setExecutionTime("");
    setMemoryUsed("");
    try {
      const startTime = Date.now();
      
      // Using Judge0 API (free tier)
      const response = await fetch("https://judge0-ce.p.rapidapi.com/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY || "your-api-key-here",
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
        },
        body: JSON.stringify({
          language_id: LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS].id,
          source_code: code,
          stdin: "",
          expected_output: ""
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const submission = await response.json();
      
      // Poll for results
      let result: ExecutionResult;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const resultResponse = await fetch(
          `https://judge0-ce.p.rapidapi.com/submissions/${submission.token}`,
          {
            headers: {
              "X-RapidAPI-Key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY || "your-api-key-here",
              "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
            },
          }
        );
        
        result = await resultResponse.json();
        attempts++;
        
      } while (result.status.id <= 2 && attempts < maxAttempts);
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      
      setExecutionTime(`${totalTime.toFixed(2)}s`);
      setMemoryUsed(result.memory ? `${result.memory} KB` : "N/A");
      // Format output based on result
      let formattedOutput = "";
      
      if (result.status.id === 3) { // Accepted
        formattedOutput = "✅ Execution successful!\n\n";
        formattedOutput += "📤 Output:\n";
        formattedOutput += result.stdout || "(no output)";
      } else if (result.status.id === 4) { // Wrong Answer
        formattedOutput = "❌ Wrong Answer\n\n";
        formattedOutput += "📤 Output:\n";
        formattedOutput += result.stdout || "(no output)";
      } else if (result.status.id === 5) { // Time Limit Exceeded
        formattedOutput = "⏰ Time Limit Exceeded\n";
      } else if (result.status.id === 6) { // Compilation Error
        formattedOutput = "🔨 Compilation Error:\n\n";
        formattedOutput += result.compile_output || "Unknown compilation error";
      } else if (result.status.id === 7) { // Runtime Error (SIGSEGV)
        formattedOutput = "💥 Runtime Error (Segmentation Fault):\n\n";
        formattedOutput += result.stderr || "Segmentation fault occurred";
      } else if (result.status.id === 8) { // Runtime Error (SIGXFSZ)
        formattedOutput = "💥 Runtime Error (Output Limit Exceeded):\n";
      } else if (result.status.id === 9) { // Runtime Error (SIGFPE)
        formattedOutput = "💥 Runtime Error (Floating Point Exception):\n\n";
        formattedOutput += result.stderr || "Division by zero or similar error";
      } else if (result.status.id === 10) { // Runtime Error (SIGABRT)
        formattedOutput = "💥 Runtime Error (Aborted):\n\n";
        formattedOutput += result.stderr || "Program was aborted";
      } else if (result.status.id === 11) { // Runtime Error (NZEC)
        formattedOutput = "💥 Runtime Error (Non-zero Exit Code):\n\n";
        formattedOutput += result.stderr || "Program exited with non-zero code";
      } else if (result.status.id === 12) { // Runtime Error (Other)
        formattedOutput = "💥 Runtime Error:\n\n";
        formattedOutput += result.stderr || "Unknown runtime error";
      } else {
        formattedOutput = `⚠️ ${result.status.description}\n`;
        if (result.stderr) {
          formattedOutput += "\n🐛 Error Details:\n" + result.stderr;
        }
        if (result.stdout) {
          formattedOutput += "\n📤 Output:\n" + result.stdout;
        }
      }
      
      setOutput(formattedOutput);
      
    } catch (error) {
      console.error("Execution error:", error);
      setOutput(
        "❌ Failed to execute code.\n\n" +
        "This could be due to:\n" +
        "• Network connectivity issues\n" +
        "• API rate limiting\n" +
        "• Server maintenance\n\n" +
        "Please try again in a moment."
      );
    } finally {
      setIsRunning(false);
    }
  };
  const getLanguageExtension = () => {
    const extensions = [EditorView.theme({
      "&": {
        fontSize: `${fontSize}px`,
      },
      ".cm-content": {
        padding: "16px",
        minHeight: "200px",
      },
      ".cm-focused": {
        outline: "none"
      }
    })];
    switch (language) {
      case "javascript":
        extensions.push(javascript());
        break;
      case "python":
        extensions.push(python());
        break;
      case "java":
        extensions.push(java());
        break;
      case "cpp":
        extensions.push(cpp());
        break;
      default:
        extensions.push(javascript());
    }
    if (isDarkTheme) {
      extensions.push(oneDark);
    }
    return extensions;
  };
  const clearOutput = () => {
    setOutput("");
    setExecutionTime("");
    setMemoryUsed("");
  };
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };
  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
    } catch (err) {
      console.error("Failed to copy output:", err);
    }
  };
  const downloadCode = () => {
    const config = LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS];
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${config.extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const resetCode = () => {
    setCode(LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS].defaultCode);
    clearOutput();
  };
  const SettingsPanel = () => (
    <div className="absolute top-12 right-0 bg-white border rounded-lg shadow-lg p-4 z-50 w-64">
      <h3 className="font-medium mb-3">Editor Settings</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Theme</label>
          <select
            value={isDarkTheme ? "dark" : "light"}
            onChange={(e) => setIsDarkTheme(e.target.value === "dark")}
            className="w-full p-2 border rounded text-sm"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-gray-600 mb-1">Font Size</label>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full p-2 border rounded text-sm"
          >
            <option value={12}>12px</option>
            <option value={14}>14px</option>
            <option value={16}>16px</option>
            <option value={18}>18px</option>
            <option value={20}>20px</option>
          </select>
        </div>
      </div>
    </div>
  );
  const CompilerContent = () => (
    <>
      <CardHeader className="flex flex-row justify-between items-center pb-4">
        <CardTitle className="flex items-center">
          <Code className="w-5 h-5 mr-2" />
          Code Compiler
        </CardTitle>
        <div className="flex items-center space-x-2">
          {!isFloating && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              {showSettings && <SettingsPanel />}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFloating(!isFloating)}
          >
            {isFloating ? "Dock" : "Float"}
          </Button>
          {isFloating && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFloating(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col h-[calc(100%-80px)]">
        {/* Language and Controls */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <div className="flex items-center space-x-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="p-2 border rounded text-sm"
              disabled={isRunning}
            >
              {Object.entries(LANGUAGE_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
            
            {executionTime && (
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                {executionTime}
                {memoryUsed && ` • ${memoryUsed}`}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyCode}
              title="Copy Code"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCode}
              title="Download Code"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetCode}
              title="Reset Code"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={runCode}
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Code
                </>
              )}
            </Button>
          </div>
        </div>
        {/* Code Editor */}
        <div className="flex-1 mb-4 border rounded-lg overflow-hidden">
          <CodeMirror
            value={code}
            height="100%"
            extensions={getLanguageExtension()}
            onChange={(value) => setCode(value)}
            className="h-full"
          />
        </div>
        {/* Output Section */}
        <div className="flex-1 border rounded-lg flex flex-col bg-gray-900 text-gray-100">
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <div className="flex items-center">
              <Terminal className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Output</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyOutput}
                className="text-gray-400 hover:text-gray-100"
                title="Copy Output"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearOutput}
                className="text-gray-400 hover:text-gray-100"
                title="Clear Output"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div
            ref={outputRef}
            className="flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap"
          >

            {output || (
              <div className="text-gray-500 text-sm">
                <AlertCircle className="inline w-4 h-4 mr-2" />
                Output will appear here after execution.
              </div>
            )}
            {output && (
              <pre className="whitespace-pre-wrap">{output}</pre>
            )}
          </div>
        </div>
      </CardContent>
    </>
  );

  return isFloating ? (
    <Draggable handle=".drag-handle" nodeRef={dragRef}>
      <div
        ref={dragRef}
        className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-[500px] h-[600px] flex flex-col z-50"
      >
        <div className="drag-handle flex justify-between items-center p-3 border-b border-gray-700 cursor-move">
          <div className="flex items-center">
            <Code className="w-4 h-4 mr-2 text-gray-100" />
            <span className="text-sm font-medium text-gray-100">Code Compiler</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFloating(false)}
            className="text-gray-400 hover:text-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col">
          <CompilerContent />
        </div>
      </div>
    </Draggable>
  ) : (
    <Card className="flex flex-col h-full">
      <CompilerContent />
    </Card>
  );
}
