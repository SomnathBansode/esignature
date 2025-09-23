import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiMail,
  FiUsers,
  FiZap,
  FiCheck,
  FiArrowRight,
  FiStar,
  FiShield,
  FiClock,
  FiTrendingUp,
} from "react-icons/fi";

const HomePage = () => {
  const { user, isAdminMode, loading } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const features = [
    {
      icon: FiZap,
      title: "Quick Setup",
      description:
        "Create professional signatures in minutes with our intuitive form builder",
    },
    {
      icon: FiMail,
      title: "Email Compatible",
      description:
        "Works seamlessly with all major email clients including Gmail, Outlook, and Apple Mail",
    },
    {
      icon: FiUsers,
      title: "Team Management",
      description:
        "Manage signatures for your entire team with admin controls and templates",
    },
    {
      icon: FiShield,
      title: "Brand Consistent",
      description: "Ensure consistent branding across all team communications",
    },
  ];

  const stats = [
    { number: "10K+", label: "Signatures Created" },
    { number: "500+", label: "Companies Trust Us" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "Support" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <FiStar className="w-4 h-4" />
              Professional Email Signatures Made Simple
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Create Stunning
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Email Signatures
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Build professional, branded email signatures that work across all
              email clients. Perfect for individuals, teams, and enterprises
              looking to make every email count.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <>
                  <button
                    onClick={() =>
                      navigate(
                        user.role === "admin" && isAdminMode
                          ? "/admin/dashboard"
                          : "/dashboard",
                        { replace: true }
                      )
                    }
                    className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <FiTrendingUp className="w-5 h-5" />
                    Go to Dashboard
                    <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => navigate("/templates", { replace: true })}
                    className="inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
                  >
                    Browse Templates
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/register", { replace: true })}
                    className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Get Started Free
                    <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => navigate("/login", { replace: true })}
                    className="inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate("/templates", { replace: true })}
                    className="inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
                  >
                    Browse Templates
                  </button>
                </>
              )}
            </div>

            {/* Trust Indicators */}
            {!user && (
              <p className="text-sm text-gray-500 mt-6">
                No credit card required • Free forever plan • Setup in 2 minutes
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Platform?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to create, manage, and deploy professional
              email signatures across your organization.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-2"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Professional Signatures in Minutes, Not Hours
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Say goodbye to complex HTML coding and inconsistent formatting.
                Our intuitive platform makes creating beautiful email signatures
                effortless.
              </p>

              <div className="space-y-4">
                {[
                  "Drag & drop signature builder",
                  "Real-time preview as you edit",
                  "One-click copy to any email client",
                  "Mobile-responsive designs",
                  "Team templates and brand control",
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiCheck className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 shadow-xl">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">JD</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        John Doe
                      </div>
                      <div className="text-sm text-gray-600">
                        Software Engineer
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <FiMail className="w-4 h-4" />
                      john@company.com
                    </div>
                    <div className="flex items-center gap-2">
                      <FiClock className="w-4 h-4" />
                      +1 (555) 123-4567
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-pink-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Upgrade Your Email Game?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of professionals who've already transformed their
              email communications.
            </p>
            <button
              onClick={() => navigate("/register", { replace: true })}
              className="group inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Start Creating Now
              <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
