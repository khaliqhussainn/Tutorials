import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Play, Users, Award, Clock, BookOpen, TrendingUp, Star, ChevronRight, Rocket, Target, Brain, Globe, CheckCircle, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-left">
              <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight text-gray-900">
                Learn without 
                <span className="block">
                  limits
                </span>
              </h1>
              <p className="text-lg md:text-xl mb-10 text-gray-600 leading-relaxed max-w-lg">
                Start, switch, or advance your career with more than 10,000 courses, Professional Certificates, and degrees from world-class universities and companies.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/signup">
                  <Button size="lg" className="bg-[#001e62] hover:bg-[#002976] text-white px-8 py-4 text-lg font-semibold rounded-lg">
                    Join For Free
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button size="lg" variant="outline" className="border-2 border-[#001e62] text-[#001e62] hover:bg-[#001e62] hover:text-white px-8 py-4 text-lg font-semibold rounded-lg">
                    Try Platform for Business
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative flex justify-end">
              <div className="relative">
                {/* Blue circular background */}
                <div className="w-96 h-96 bg-[#001e62] rounded-full relative">
                  {/* Woman image positioned over the circle */}
                  <div className="absolute -bottom-0 -left-12 w-80 h-96">
                    <img 
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2788&q=80" 
                      alt="Professional woman" 
                      className="w-full h-full object-cover object-center rounded-b-full"
                      style={{ clipPath: 'ellipse(50% 100% at 50% 100%)' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Goals Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What brings you to our platform today?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose your learning path and let us personalize your experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-gray-200 bg-white p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#001e62] rounded-lg flex items-center justify-center flex-shrink-0">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-gray-900">Start my career</h3>
            </Card>

            <Card className="border border-gray-200 bg-white p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#001e62] rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-gray-900">Change my career</h3>
            </Card>

            <Card className="border border-gray-200 bg-white p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#001e62] rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-gray-900">Grow in my current role</h3>
            </Card>

            <Card className="border border-gray-200 bg-white p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#001e62] rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-gray-900">Explore topics outside of work</h3>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section - New Modern Design */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Choose Our Platform?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience learning like never before with our innovative approach to education
            </p>
          </div>

          {/* Main Feature Cards */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Card 1 - AI-Powered Learning */}
            <div className="group relative bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="w-16 h-16 bg-[#001e62] rounded-xl flex items-center justify-center mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Learning</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Our advanced AI adapts to your learning style, pace, and preferences to create a truly personalized educational experience.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-[#001e62] rounded-full mr-3"></div>
                  Personalized learning paths
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-[#001e62] rounded-full mr-3"></div>
                  Adaptive assessments
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-[#001e62] rounded-full mr-3"></div>
                  Smart recommendations
                </li>
              </ul>
            </div>

            {/* Card 2 - Expert Instruction */}
            <div className="group relative bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="w-16 h-16 bg-[#001e62] rounded-xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Expert Instruction</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Learn from industry leaders and top universities with our comprehensive library of high-quality courses and content.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-[#001e62] rounded-full mr-3"></div>
                  Industry professionals
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-[#001e62] rounded-full mr-3"></div>
                  University partnerships
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-[#001e62] rounded-full mr-3"></div>
                  Updated curriculum
                </li>
              </ul>
            </div>

            {/* Card 3 - Flexible Learning */}
            <div className="group relative bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="w-16 h-16 bg-[#001e62] rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Flexible Learning</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Study at your own pace, on any device, anywhere. Our platform fits seamlessly into your busy lifestyle.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-[#001e62] rounded-full mr-3"></div>
                  Learn at your pace
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-[#001e62] rounded-full mr-3"></div>
                  Mobile & desktop access
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-[#001e62] rounded-full mr-3"></div>
                  Offline downloads
                </li>
              </ul>
            </div>
          </div>

          {/* Stats Section */}
          <div className="bg-[#001e62] rounded-3xl p-12 text-white">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">10,000+</div>
                <div className="text-blue-200">Courses Available</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">2M+</div>
                <div className="text-blue-200">Active Learners</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">500+</div>
                <div className="text-blue-200">Expert Instructors</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">95%</div>
                <div className="text-blue-200">Satisfaction Rate</div>
              </div>
            </div>
          </div>

          {/* Bottom Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#001e62]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Award className="w-6 h-6 text-[#001e62]" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Certificates</h4>
              <p className="text-sm text-gray-600">Earn industry-recognized certificates</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#001e62]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Play className="w-6 h-6 text-[#001e62]" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Video Content</h4>
              <p className="text-sm text-gray-600">High-quality video lessons</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#001e62]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-[#001e62]" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Resources</h4>
              <p className="text-sm text-gray-600">Comprehensive learning materials</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#001e62]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-[#001e62]" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Progress</h4>
              <p className="text-sm text-gray-600">Track your learning journey</p>
            </div>
          </div>
        </div>
      </section>

      {/* Learner Outcomes Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Learner outcomes on our platform
          </h2>
          <div className="bg-gray-50 rounded-2xl p-12">
            <div className="text-6xl font-bold text-[#001e62] mb-4">77%</div>
            <p className="text-xl text-gray-700 mb-6 max-w-3xl mx-auto leading-relaxed">
              <span className="font-semibold">of learners report career benefits,</span> such as new
              skills, increased pay, and new job opportunities.
            </p>
            <p className="text-gray-600 mb-8">
              <Link href="#" className="text-[#001e62] hover:underline font-medium">
                2023 Learner Outcomes Report
              </Link>
            </p>
            <Link href="/auth/signup">
              <Button size="lg" className="bg-[#001e62] hover:bg-[#002976] text-white px-8 py-3 text-lg font-semibold rounded-lg">
                Join for Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Popular Courses
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Start learning with our most popular courses designed by industry experts
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border border-gray-200 bg-white overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-[#001e62] to-[#003487] relative">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=2670&q=80" 
                  alt="Data Science" 
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute bottom-4 left-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Data Science Fundamentals</h3>
                <p className="text-gray-600 mb-4">Master the basics of data analysis and machine learning</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="ml-1 text-gray-700 font-medium">4.8 (2,340)</span>
                  </div>
                  <Button size="sm" className="bg-[#001e62] hover:bg-[#002976] text-white">
                    Enroll Now
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="border border-gray-200 bg-white overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-orange-400 to-orange-600 relative">
                <img 
                  src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2669&q=80" 
                  alt="Web Development" 
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute bottom-4 left-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Web Development Bootcamp</h3>
                <p className="text-gray-600 mb-4">Build modern web applications from scratch</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="ml-1 text-gray-700 font-medium">4.9 (3,120)</span>
                  </div>
                  <Button size="sm" className="bg-[#001e62] hover:bg-[#002976] text-white">
                    Enroll Now
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="border border-gray-200 bg-white overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-green-400 to-green-600 relative">
                <img 
                  src="https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2670&q=80" 
                  alt="AI Machine Learning" 
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute bottom-4 left-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI & Machine Learning</h3>
                <p className="text-gray-600 mb-4">Dive into artificial intelligence and ML algorithms</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="ml-1 text-gray-700 font-medium">4.7 (1,890)</span>
                  </div>
                  <Button size="sm" className="bg-[#001e62] hover:bg-[#002976] text-white">
                    Enroll Now
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Link href="/courses">
              <Button variant="outline" className="border-[#001e62] text-[#001e62] hover:bg-[#001e62] hover:text-white px-6 py-2 rounded-lg">
                View All Courses
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Community Reviews Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Community Says
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join millions of learners who have transformed their careers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border border-gray-200 bg-white p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#001e62] rounded-full flex items-center justify-center text-white font-semibold">
                  S
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Sarah Chen</h4>
                  <p className="text-gray-600 text-sm">Data Scientist</p>
                </div>
              </div>
              <div className="flex text-yellow-500 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 leading-relaxed">
                "The AI-powered assessments helped me identify my weak points and focus my learning. 
                I landed my dream job as a data scientist within 6 months!"
              </p>
            </Card>

            <Card className="border border-gray-200 bg-white p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#001e62] rounded-full flex items-center justify-center text-white font-semibold">
                  M
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Marcus Johnson</h4>
                  <p className="text-gray-600 text-sm">Full Stack Developer</p>
                </div>
              </div>
              <div className="flex text-yellow-500 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 leading-relaxed">
                "The community support is incredible. I connected with mentors and peers who helped 
                me transition from marketing to tech. Best decision ever!"
              </p>
            </Card>

            <Card className="border border-gray-200 bg-white p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#001e62] rounded-full flex items-center justify-center text-white font-semibold">
                  A
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Aisha Patel</h4>
                  <p className="text-gray-600 text-sm">Product Manager</p>
                </div>
              </div>
              <div className="flex text-yellow-500 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 leading-relaxed">
                "The courses are perfectly structured and the progress tracking kept me motivated. 
                I got promoted to Senior Product Manager thanks to the skills I learned here."
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-[#001e62] text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="text-lg mb-8 text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Join millions of students who are already advancing their careers with personalized, 
            AI-powered learning experiences. Start for free today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 text-lg font-semibold rounded-lg">
                Start Learning Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/courses">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-[#001e62] px-8 py-3 text-lg font-semibold rounded-lg">
                Browse Free Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}