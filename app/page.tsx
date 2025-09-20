import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Play, Users, Award, Clock, BookOpen, TrendingUp, Star, ChevronRight, Rocket, Target, Brain, Globe, CheckCircle, ArrowRight, Quote, Calendar, User, Eye } from 'lucide-react'

export default function HomePage() {
  // Mock courses data - replace with real data from your API
  const latestCourses = [
    {
      id: 1,
      title: "Advanced React Development",
      description: "Master modern React patterns, hooks, and performance optimization",
      image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      instructor: "Sarah Wilson",
      rating: 4.9,
      students: 2340,
      duration: "8 weeks",
      level: "Advanced",
      category: "Web Development",
      price: "$89"
    },
    {
      id: 2,
      title: "AI Ethics & Responsible AI",
      description: "Navigate the ethical landscape of artificial intelligence and machine learning",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      instructor: "Dr. Michael Chen",
      rating: 4.8,
      students: 1890,
      duration: "6 weeks",
      level: "Intermediate",
      category: "Artificial Intelligence",
      price: "$129"
    },
    {
      id: 3,
      title: "Cloud Architecture Mastery",
      description: "Design scalable cloud solutions with AWS, Azure, and best practices",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=2072&q=80",
      instructor: "Alex Rodriguez",
      rating: 4.7,
      students: 3120,
      duration: "10 weeks",
      level: "Advanced",
      category: "Cloud Computing",
      price: "$149"
    }
  ]

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
                <div className="w-96 h-96 bg-[#001e62] rounded-full relative">
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
            <Card className="border border-gray-200 bg-white p-4 flex items-center space-x-3 hover:border-[#001e62] transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-[#001e62] rounded-lg flex items-center justify-center flex-shrink-0">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-gray-900">Start my career</h3>
            </Card>

            <Card className="border border-gray-200 bg-white p-4 flex items-center space-x-3 hover:border-[#001e62] transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-[#001e62] rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-gray-900">Change my career</h3>
            </Card>

            <Card className="border border-gray-200 bg-white p-4 flex items-center space-x-3 hover:border-[#001e62] transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-[#001e62] rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-gray-900">Grow in my current role</h3>
            </Card>

            <Card className="border border-gray-200 bg-white p-4 flex items-center space-x-3 hover:border-[#001e62] transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-[#001e62] rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-gray-900">Explore topics outside of work</h3>
            </Card>
          </div>
        </div>
      </section>

      {/* Latest Courses Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-[#001e62]/10 rounded-full text-[#001e62] text-sm font-medium mb-4">
              <Calendar className="w-4 h-4 mr-2" />
              Latest Releases
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              New Courses Just Launched
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay ahead with our newest courses designed by industry experts and updated with the latest trends
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {latestCourses.map((course) => (
              <Card key={course.id} className="border border-gray-200 bg-white overflow-hidden hover:border-[#001e62] transition-all duration-300 group">
                <div className="relative h-56">
                  <img 
                    src={course.image}
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-[#001e62]">
                      {course.level}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-[#001e62] text-white px-3 py-1 rounded-full text-sm font-bold">
                      {course.price}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                      {course.category}
                    </span>
                    <span className="mx-2">•</span>
                    <Clock className="w-4 h-4 mr-1" />
                    {course.duration}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#001e62] transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    {course.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-[#001e62] rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-700">{course.instructor}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Eye className="w-4 h-4 mr-1" />
                      {course.students.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < Math.floor(course.rating) ? 'fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-700">{course.rating}</span>
                    </div>
                    <Button size="sm" className="bg-[#001e62] hover:bg-[#002976] text-white">
                      Enroll Now
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/courses">
              <Button variant="outline" className="border-2 border-[#001e62] text-[#001e62] hover:bg-[#001e62] hover:text-white px-8 py-3 text-lg font-semibold rounded-lg">
                View All Courses
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
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

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <div className="group relative bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-[#001e62] transition-all duration-300">
              <div className="w-16 h-16 bg-[#001e62] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Learning</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Our advanced AI adapts to your learning style, pace, and preferences to create a truly personalized educational experience.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#001e62] mr-3 flex-shrink-0" />
                  Personalized learning paths
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#001e62] mr-3 flex-shrink-0" />
                  Adaptive assessments
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#001e62] mr-3 flex-shrink-0" />
                  Smart recommendations
                </li>
              </ul>
            </div>

            <div className="group relative bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-[#001e62] transition-all duration-300">
              <div className="w-16 h-16 bg-[#001e62] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Expert Instruction</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Learn from industry leaders and top universities with our comprehensive library of high-quality courses and content.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#001e62] mr-3 flex-shrink-0" />
                  Industry professionals
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#001e62] mr-3 flex-shrink-0" />
                  University partnerships
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#001e62] mr-3 flex-shrink-0" />
                  Updated curriculum
                </li>
              </ul>
            </div>

            <div className="group relative bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-[#001e62] transition-all duration-300">
              <div className="w-16 h-16 bg-[#001e62] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Flexible Learning</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Study at your own pace, on any device, anywhere. Our platform fits seamlessly into your busy lifestyle.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#001e62] mr-3 flex-shrink-0" />
                  Learn at your pace
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#001e62] mr-3 flex-shrink-0" />
                  Mobile & desktop access
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#001e62] mr-3 flex-shrink-0" />
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
        </div>
      </section>

      {/* Professional Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join professionals who have accelerated their careers through our comprehensive learning platform
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 relative">
              <Quote className="w-12 h-12 text-[#001e62]/20 mb-6" />
              <p className="text-lg text-gray-700 leading-relaxed mb-8 italic">
                "The AI-powered learning paths completely transformed my approach to skill development. 
                Within 8 months, I transitioned from marketing to data science and secured a senior role 
                at a Fortune 500 company."
              </p>
              <div className="flex items-center">
                <img 
                  src="https://images.unsplash.com/photo-1494790108755-2616b612b550?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"
                  alt="Sarah Chen"
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div className="ml-4">
                  <h4 className="font-bold text-gray-900">Sarah Chen</h4>
                  <p className="text-gray-600 text-sm">Senior Data Scientist</p>
                  <p className="text-gray-500 text-sm">Meta</p>
                </div>
              </div>
              <div className="flex text-yellow-500 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-100 relative">
              <Quote className="w-12 h-12 text-[#001e62]/20 mb-6" />
              <p className="text-lg text-gray-700 leading-relaxed mb-8 italic">
                "The hands-on projects and mentorship program here are unmatched. I built a portfolio 
                that landed me my dream job as a full-stack developer. The community support kept me 
                motivated throughout the journey."
              </p>
              <div className="flex items-center">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"
                  alt="Marcus Johnson"
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div className="ml-4">
                  <h4 className="font-bold text-gray-900">Marcus Johnson</h4>
                  <p className="text-gray-600 text-sm">Full Stack Developer</p>
                  <p className="text-gray-500 text-sm">Spotify</p>
                </div>
              </div>
              <div className="flex text-yellow-500 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-100 relative">
              <Quote className="w-12 h-12 text-[#001e62]/20 mb-6" />
              <p className="text-lg text-gray-700 leading-relaxed mb-8 italic">
                "As a working mother, the flexible schedule was crucial. The bite-sized lessons and 
                progress tracking helped me stay consistent. I earned my cloud certification and got 
                promoted to Lead Solutions Architect."
              </p>
              <div className="flex items-center">
                <img 
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"
                  alt="Aisha Patel"
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div className="ml-4">
                  <h4 className="font-bold text-gray-900">Aisha Patel</h4>
                  <p className="text-gray-600 text-sm">Lead Solutions Architect</p>
                  <p className="text-gray-500 text-sm">Amazon Web Services</p>
                </div>
              </div>
              <div className="flex text-yellow-500 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learner Outcomes Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
            Proven Career Impact
          </h2>
          <div className="bg-gradient-to-br from-[#001e62] to-[#003487] rounded-3xl p-12 text-white">
            <div className="text-7xl font-bold mb-6">77%</div>
            <p className="text-2xl mb-8 max-w-3xl mx-auto leading-relaxed">
              <span className="font-semibold">of learners report career benefits,</span> including new
              skills, increased compensation, and advancement opportunities.
            </p>

            <Link href="/auth/signup">
              <Button size="lg" className="bg-white hover:bg-gray-100 text-[#001e62] px-10 py-4 text-lg font-bold rounded-lg">
                Start Your Journey
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-[#001e62] text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Ready to Accelerate Your Career?
          </h2>
          <p className="text-xl mb-12 text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Join over 2 million professionals who are already advancing their careers with personalized, 
            AI-powered learning experiences. Start your transformation today.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-white hover:bg-gray-100 text-[#001e62] px-10 py-4 text-xl font-bold rounded-lg">
                Get Started Free
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </Link>
            <Link href="/courses">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-[#001e62] px-10 py-4 text-xl font-bold rounded-lg">
                Explore Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}