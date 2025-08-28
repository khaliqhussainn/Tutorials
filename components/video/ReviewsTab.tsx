import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Star, X, Loader2, Users, TrendingUp } from "lucide-react";

interface CourseReviewData {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
  user: {
    name: string;
    image?: string;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface ReviewsTabProps {
  courseId: string;
  reviews: CourseReviewData[];
  reviewStats: ReviewStats | null;
  userReview: CourseReviewData | null;
  setUserReview: React.Dispatch<React.SetStateAction<CourseReviewData | null>>;
  fetchReviews: () => Promise<void>;
}

export function ReviewsTab({
  courseId,
  reviews,
  reviewStats,
  userReview,
  setUserReview,
  fetchReviews,
}: ReviewsTabProps) {
  const [newReview, setNewReview] = useState({
    rating: 0,
    title: "",
    comment: "",
  });
  const [showNewReview, setShowNewReview] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const submitReview = async () => {
    if (newReview.rating === 0) return;

    try {
      setSubmittingReview(true);
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReview),
      });

      if (response.ok) {
        const data = await response.json();
        setUserReview(data.review);
        setNewReview({ rating: 0, title: "", comment: "" });
        setShowNewReview(false);
        fetchReviews();
      }
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const StarRating = ({
    rating,
    onRatingChange,
    readonly = false,
    size = "w-5 h-5",
  }: {
    rating: number;
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
    size?: string;
  }) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRatingChange?.(star)}
          className={`${
            star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
          } ${!readonly ? "hover:text-yellow-400 cursor-pointer transition-colors" : ""}`}
          disabled={readonly}
        >
          <Star className={size} />
        </button>
      ))}
    </div>
  );

  const getRatingText = (rating: number) => {
    if (rating >= 4.5) return "Excellent";
    if (rating >= 4.0) return "Very Good";
    if (rating >= 3.5) return "Good";
    if (rating >= 3.0) return "Average";
    if (rating >= 2.0) return "Below Average";
    return "Poor";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Student Reviews</h2>
            <p className="text-gray-600">
              {reviewStats?.totalReviews || 0} review{(reviewStats?.totalReviews || 0) !== 1 ? 's' : ''} • Share your learning experience
            </p>
          </div>
          {!userReview && (
            <Button
              onClick={() => setShowNewReview(true)}
              size="lg"
              className="bg-[#001e62] hover:bg-[#001e62]/90 text-white font-semibold px-6 py-3 rounded-lg shadow-sm"
            >
              <Star className="w-5 h-5 mr-2" />
              Leave Review
            </Button>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showNewReview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Share Your Experience</h3>
                <button
                  onClick={() => setShowNewReview(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  How would you rate this course? *
                </label>
                <div className="flex items-center space-x-4">
                  <StarRating
                    rating={newReview.rating}
                    onRatingChange={(rating) =>
                      setNewReview((prev) => ({ ...prev, rating }))
                    }
                    size="w-8 h-8"
                  />
                  {newReview.rating > 0 && (
                    <span className="text-lg font-medium text-gray-700">
                      {getRatingText(newReview.rating)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Review Title (Optional)
                </label>
                <Input
                  value={newReview.title}
                  onChange={(e) =>
                    setNewReview((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="What's the highlight of this course?"
                  className="text-lg py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Your Review (Optional)
                </label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) =>
                    setNewReview((prev) => ({
                      ...prev,
                      comment: e.target.value,
                    }))
                  }
                  placeholder="Share what you learned, what you liked, and what could be improved..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001e62] focus:border-[#001e62] resize-none text-gray-700"
                  rows={5}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
              <Button variant="outline" onClick={() => setShowNewReview(false)} className="px-6">
                Cancel
              </Button>
              <Button
                onClick={submitReview}
                disabled={submittingReview || newReview.rating === 0}
                className="bg-[#001e62] hover:bg-[#001e62]/90 px-6"
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 mr-2" />
                    Publish Review
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Statistics */}
      {reviewStats && reviewStats.totalReviews > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-gray-200 p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start space-x-4 mb-4">
                <div className="text-6xl font-bold text-[#001e62]">
                  {reviewStats.averageRating.toFixed(1)}
                </div>
                <div>
                  <StarRating
                    rating={Math.round(reviewStats.averageRating)}
                    readonly
                    size="w-6 h-6"
                  />
                  <p className="text-lg font-semibold text-gray-700 mt-1">
                    {getRatingText(reviewStats.averageRating)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center lg:justify-start space-x-2 text-gray-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-lg">
                  {reviewStats.totalReviews} student review{reviewStats.totalReviews !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 text-lg">Rating Distribution</h4>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center space-x-3">
                    <span className="w-3 text-sm font-medium text-gray-700">{rating}</span>
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            reviewStats.totalReviews > 0
                              ? (reviewStats.ratingDistribution[
                                  rating as keyof typeof reviewStats.ratingDistribution
                                ] /
                                  reviewStats.totalReviews) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">
                      {
                        reviewStats.ratingDistribution[
                          rating as keyof typeof reviewStats.ratingDistribution
                        ]
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User's Review (if exists) */}
      {userReview && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              {userReview.user.image ? (
                <img
                  src={userReview.user.image}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <Users className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-semibold text-gray-900">Your Review</h4>
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                  Your Rating
                </span>
              </div>
              <div className="flex items-center space-x-3 mb-3">
                <StarRating rating={userReview.rating} readonly />
                <span className="text-sm text-gray-600">
                  {new Date(userReview.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              {userReview.title && (
                <h5 className="font-medium text-gray-900 mb-2 text-lg">
                  {userReview.title}
                </h5>
              )}
              {userReview.comment && (
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {userReview.comment}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.filter(review => review.id !== userReview?.id).map((review) => (
          <div
            key={review.id}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-all duration-200"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                {review.user.image ? (
                  <img
                    src={review.user.image}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <Users className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-lg">{review.user.name}</h4>
                  <span className="text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-3 mb-3">
                  <StarRating rating={review.rating} readonly />
                  <span className="text-sm font-medium text-gray-600">
                    {getRatingText(review.rating)}
                  </span>
                </div>
                {review.title && (
                  <h5 className="font-semibold text-gray-900 mb-3 text-lg">
                    {review.title}
                  </h5>
                )}
                {review.comment && (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {review.comment}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {reviews.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
            <Star className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-700 mb-3">
              No reviews yet
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto text-lg">
              Be the first to share your learning experience and help other students!
            </p>
            {!userReview && (
              <Button
                onClick={() => setShowNewReview(true)}
                size="lg"
                className="bg-[#001e62] hover:bg-[#001e62]/90 px-6"
              >
                <Star className="w-5 h-5 mr-2" />
                Write First Review
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}