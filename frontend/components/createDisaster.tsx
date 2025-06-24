import { useState, KeyboardEvent, FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button"; // Still used for type consistency, but we'll override styles
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, Pencil, FileText, Tag } from 'lucide-react';

interface CreateDisasterFormProps {
  onSuccess?: () => void;
}

export default function CreateDisasterForm({ onSuccess }: CreateDisasterFormProps) {
  // --- STATE MANAGEMENT (Unchanged) ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- TAG HANDLING LOGIC (Unchanged) ---
  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = currentTag.trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // --- SUBMISSION LOGIC (Unchanged) ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!title.trim() || !description.trim() || tags.length === 0) {
      toast.error("Title, description, and at least one tag are required.");
      setIsLoading(false);
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

    try {
      const response = await fetch(`${API_URL}/disasters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, tags }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || 'An error occurred while creating the disaster.');
      }

      toast.success('Disaster Reported Successfully!', {
        description: 'Thank you for contributing to community safety.',
      });
      
      setTitle('');
      setDescription('');
      setTags([]);
      setCurrentTag('');
      onSuccess?.();
    } catch (error: any) {
      console.error("Submission Error:", error);
      toast.error(error.message || "Failed to submit the report.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- REVAMPED JSX STRUCTURE ---
  // The component is designed to live inside the DialogContent, so we remove the outer Card.
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title Field */}
      <div className="space-y-2">
        <Label htmlFor="title" className="flex items-center text-slate-700 font-semibold">
          <Pencil className="w-4 h-4 mr-2 text-slate-500" />
          Disaster Title
        </Label>
        <Input
          id="title"
          placeholder="e.g., Major Power Outage in Downtown"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="bg-black/5 border-slate-300/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
        />
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <Label htmlFor="description" className="flex items-center text-slate-700 font-semibold">
          <FileText className="w-4 h-4 mr-2 text-slate-500" />
          Detailed Description
        </Label>
        <Textarea
          id="description"
          placeholder="Provide specific locations, affected areas, and any observed details. This helps with accurate mapping."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
          className="bg-black/5 border-slate-300/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
        />
      </div>

      {/* Enhanced Tags Field */}
      <div className="space-y-2">
        <Label htmlFor="tags" className="flex items-center text-slate-700 font-semibold">
          <Tag className="w-4 h-4 mr-2 text-slate-500" />
          Tags (e.g., flood, power-outage, infrastructure)
        </Label>
        <div className="flex flex-wrap gap-2 p-2.5 bg-slate-100/80 rounded-lg border border-slate-300/70">
          {tags.map((tag) => (
            <div key={tag} className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full px-3 py-1 text-sm font-medium shadow-sm">
              <span>{tag}</span>
              <button 
                type="button" 
                onClick={() => removeTag(tag)} 
                className="rounded-full hover:bg-white/20 p-0.5 transition-colors"
                aria-label={`Remove tag: ${tag}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <Input
            id="tags"
            placeholder="Add tag & press Enter..."
            className="flex-1 border-none shadow-none focus-visible:ring-0 h-auto p-1 bg-transparent placeholder:text-slate-500"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
          />
        </div>
        <p className="text-xs text-slate-500 pt-1">Press Enter or Comma to add a tag. Clear and concise tags are best.</p>
      </div>

      {/* Enhanced Submit Button */}
      <div className="pt-4">
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-bold text-white shadow-lg transition-all duration-300 ease-out
                     bg-gradient-to-r from-blue-600 to-purple-600 
                     hover:from-blue-700 hover:to-purple-700 hover:shadow-2xl hover:scale-105
                     focus:outline-none focus:ring-4 focus:ring-purple-500/50
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting Report...
            </>
          ) : (
            'Submit Disaster Report'
          )}
        </button>
      </div>
    </form>
  );
}