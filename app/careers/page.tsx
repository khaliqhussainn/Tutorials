// app/careers/page.tsx - Simple careers page to fix 404 error
export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Career Opportunities
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Explore exciting career paths and opportunities in technology and education.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Sample career cards */}
          {[
            'Data Analyst',
            'Project Manager', 
            'Cyber Security Analyst',
            'Data Scientist',
            'UI/UX Designer',
            'Machine Learning Engineer'
          ].map((career) => (
            <div key={career} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {career}
              </h3>
              <p className="text-gray-600 mb-4">
                Learn the skills needed to become a successful {career.toLowerCase()}.
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                Learn More
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}