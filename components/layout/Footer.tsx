// components/Footer.tsx - Mobile-optimized footer component for learning platform
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Users,
  Award,
  TrendingUp,
  Heart,
  ArrowRight,
} from "lucide-react";

const Footer = () => {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  // Hide footer on specific pages
  const hideFooterOnPages = ['/auth/signin', '/auth/signup', '/auth/forgot-password'];
  const shouldHideFooter = hideFooterOnPages.some(page => pathname.startsWith(page));

  // Early return if footer should be hidden
  if (shouldHideFooter) {
    return null;
  }

  const footerLinks = {
    courses: [
      { name: "Programming", href: "/courses?category=Programming" },
      { name: "Design", href: "/courses?category=Design" },
      { name: "Business", href: "/courses?category=Business" },
      { name: "Marketing", href: "/courses?category=Marketing" },
      { name: "Data Science", href: "/courses?category=Data Science" },
      { name: "View All Courses", href: "/courses" },
    ],
    company: [
      { name: "About Us", href: "/about" },
      { name: "Our Team", href: "/team" },
      { name: "Careers", href: "/careers" },
      { name: "Press", href: "/press" },
      { name: "Blog", href: "/blog" },
      { name: "Contact", href: "/contact" },
    ],
    support: [
      { name: "Help Center", href: "/help" },
      { name: "Student Support", href: "/support" },
      { name: "Instructor Support", href: "/instructor-support" },
      { name: "Community", href: "/community" },
      { name: "System Status", href: "/status" },
      { name: "Accessibility", href: "/accessibility" },
    ],
    legal: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Cookie Policy", href: "/cookies" },
      { name: "DMCA", href: "/dmca" },
      { name: "Refund Policy", href: "/refunds" },
      { name: "Sitemap", href: "/sitemap" },
    ],
  };

  const socialLinks = [
    { name: "Facebook", href: "https://facebook.com", icon: Facebook },
    { name: "Twitter", href: "https://twitter.com", icon: Twitter },
    { name: "Instagram", href: "https://instagram.com", icon: Instagram },
    { name: "LinkedIn", href: "https://linkedin.com", icon: Linkedin },
    { name: "YouTube", href: "https://youtube.com", icon: Youtube },
  ];

  const stats = [
    { label: "Active Students", value: "50K+", icon: Users },
    { label: "Expert Courses", value: "200+", icon: BookOpen },
    { label: "Success Rate", value: "95%", icon: Award },
    { label: "Course Rating", value: "4.8★", icon: TrendingUp },
  ];

  return (
    <footer className="bg-white border-t border-gray-200">
      {/* Newsletter Section */}
      <div className="bg-primary-600 ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Stay Updated with New Courses
              </h3>
              <p className="text-blue-100 text-lg mb-6 lg:mb-0">
                Get notified about new courses, special offers, and learning
                tips delivered to your inbox.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="w-full px-6 py-4 rounded-xl border-0 focus:ring-2 focus:ring-yellow-400 text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <button className="bg-indigo-900 hover:bg-indigo-600 text-white font-bold px-8 py-4 rounded-xl transition-colors flex items-center justify-center whitespace-nowrap">
                Subscribe
                <Mail className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-xl mb-4">
                  <stat.icon className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-6 gap-8">
          {/* Brand Section - Full width on mobile, 2 columns on desktop */}
          <div className="col-span-full lg:col-span-2">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-blue-600 rounded-xl flex items-center justify-center mr-3">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">LearnHub</span>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Empowering millions of learners worldwide with expert-led courses,
              interactive projects, and personalized learning paths. Start your
              journey to success today.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-gray-600">
                <Mail className="w-5 h-5 mr-3 text-primary-600" />
                <span>support@learnhub.com</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Phone className="w-5 h-5 mr-3 text-primary-600" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-3 text-primary-600" />
                <span>San Francisco, CA</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <Link
                  key={social.name}
                  href={social.href}
                  className="w-10 h-10 bg-gray-100 hover:bg-primary-100 rounded-lg flex items-center justify-center transition-colors group"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links Grid - 2 columns on mobile, individual columns on desktop */}
          <div className="col-span-full lg:col-span-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-8">
              {/* Courses */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-6">
                  Courses
                </h4>
                <ul className="space-y-4">
                  {footerLinks.courses.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-gray-600 hover:text-primary-600 transition-colors flex items-center group text-sm lg:text-base"
                      >
                        {link.name}
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-6">
                  Company
                </h4>
                <ul className="space-y-4">
                  {footerLinks.company.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-gray-600 hover:text-primary-600 transition-colors flex items-center group text-sm lg:text-base"
                      >
                        {link.name}
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-6">
                  Support
                </h4>
                <ul className="space-y-4">
                  {footerLinks.support.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-gray-600 hover:text-primary-600 transition-colors flex items-center group text-sm lg:text-base"
                      >
                        {link.name}
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-6">Legal</h4>
                <ul className="space-y-4">
                  {footerLinks.legal.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-gray-600 hover:text-primary-600 transition-colors flex items-center group text-sm lg:text-base"
                      >
                        {link.name}
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center text-gray-600 mb-4 md:mb-0">
              <span>© {currentYear} LearnHub. All rights reserved.</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                href="/trust"
                className="text-gray-600 hover:text-primary-600 transition-colors text-sm"
              >
                Trust & Safety
              </Link>
              <Link
                href="/investors"
                className="text-gray-600 hover:text-primary-600 transition-colors text-sm"
              >
                Investors
              </Link>
              <Link
                href="/affiliates"
                className="text-gray-600 hover:text-primary-600 transition-colors text-sm"
              >
                Affiliate Program
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;