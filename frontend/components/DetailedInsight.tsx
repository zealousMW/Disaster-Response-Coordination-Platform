import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // Import Dialog parts for structure

// --- (Interfaces for Report and SocialMediaPost remain the same) ---
interface Report { id: number; created_at: string; user_id: string; content: string; image_url?: string; verification_status?: string; }
interface SocialMediaPost { id: string; post: string; user: string; userDisplayName: string; userAvatar?: string; timestamp: string; platform: string; url: string; }

// --- We no longer need the 'onClose' prop ---
interface DetailedInsightProps {
  disasterId: string | number;
}

export default function DetailedInsight({ disasterId }: DetailedInsightProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [socialMediaPosts, setSocialMediaPosts] = useState<SocialMediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!disasterId) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [reportsResponse, socialMediaResponse] = await Promise.all([
          fetch(`http://localhost:3001/api/reports/${disasterId}`),
          fetch(`http://localhost:3001/api/disasters/${disasterId}/social-media`)
        ]);

        if (!reportsResponse.ok) throw new Error(`Failed to fetch citizen reports`);
        if (!socialMediaResponse.ok) throw new Error(`Failed to fetch social media posts`);

        const reportsData: Report[] = await reportsResponse.json();
        const socialMediaData: SocialMediaPost[] = await socialMediaResponse.json();

        setReports(reportsData);
        setSocialMediaPosts(socialMediaData);
        
        if (reportsData.length === 0 && socialMediaData.length === 0) {
          toast.info("No detailed reports or social media activity found.");
        }
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [disasterId]);

  // The component now returns its content directly, without any modal wrapper
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl">Detailed Insight</DialogTitle>
        <DialogDescription>
          Live citizen reports and social media mentions for disaster ID: {disasterId}.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 h-[70vh] flex flex-col"> {/* Fixed height for content area */}
        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="flex-grow flex items-center justify-center text-red-500">
            Error: {error}
          </div>
        ) : (
          <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
            {/* Citizen Reports Section */}
            <section className="flex flex-col overflow-hidden">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Citizen Reports ({reports.length})</h3>
              <div className="flex-grow overflow-y-auto bg-gray-50 p-3 rounded-lg border">
                {reports.length > 0 ? reports.map(report => (
                  <div key={report.id} className="bg-white p-3 rounded-md shadow-sm mb-3">
                    <div className="flex items-center gap-2">
                      <p className="text-gray-800 mb-0">{report.content}</p>
                      {report.verification_status === "verified" && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full border border-green-300">Verified</span>
                      )}
                    </div>
                    {report.image_url && <img src={report.image_url} alt="Report" className="mt-2 rounded-lg max-h-40"/>}
                    <p className="text-xs text-gray-500 mt-2">By: {report.user_id} on {new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                )) : <p className="text-gray-500">No citizen reports available.</p>}
              </div>
            </section>

            {/* Social Media Section */}
            <section className="flex flex-col overflow-hidden">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Social Media Mentions ({socialMediaPosts.length})</h3>
              <div className="flex-grow overflow-y-auto bg-gray-50 p-3 rounded-lg border">
                {socialMediaPosts.length > 0 ? socialMediaPosts.map(post => (
                    <a href={post.url} target="_blank" rel="noopener noreferrer" key={post.id} className="block bg-white p-3 rounded-md shadow-sm mb-3 hover:bg-blue-50 transition-colors">
                        <div className="flex items-start space-x-3">
                            {post.userAvatar && <img src={post.userAvatar} className="w-10 h-10 rounded-full" alt="avatar"/>}
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{post.userDisplayName} <span className="font-normal text-gray-500">@{post.user}</span></p>
                                <p className="text-gray-800 my-1">{post.post}</p>
                                <p className="text-xs text-gray-500">Platform: {post.platform} - {new Date(post.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    </a>
                )) : <p className="text-gray-500">No social media posts found.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}