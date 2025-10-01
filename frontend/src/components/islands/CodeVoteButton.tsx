import { useState } from 'react';
import { apiPost } from '../../lib/utils/api';

interface CodeVoteButtonProps {
  codeId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote?: 'upvote' | 'downvote' | null;
}

export default function CodeVoteButton({
  codeId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote = null
}: CodeVoteButtonProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [loading, setLoading] = useState(false);

  const handleVote = async () => {
    if (loading) return;

    setLoading(true);

    try {
      // 每次点击都增加点赞数
      const result = await apiPost(`/api/v1/codes/${codeId}/vote`, { voteType: 'upvote' });

      if (result.success) {
        setUpvotes(result.data.upvoteCount || 0);
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/20 ${
        loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      title="Like this code"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
        />
      </svg>
      <span className="text-sm font-medium">{upvotes}</span>
    </button>
  );
}
