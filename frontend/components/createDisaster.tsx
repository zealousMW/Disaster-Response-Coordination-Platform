import { useState, KeyboardEvent, FormEvent } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2 } from 'lucide-react';

interface CreateDisasterFormProps {
  // Optional: A function to call after a successful submission, e.g., to close a modal.
  onSuccess?: () => void;
}

export default function CreateDisasterForm({ onSuccess }: CreateDisasterFormProps) {
  // --- 1. FORM STATE MANAGEMENT ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- 2. TAG HANDLING LOGIC ---
  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Add tag on Enter or Comma press
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = currentTag.trim();
      
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setCurrentTag(''); // Reset the input field
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // --- 3. FORM SUBMISSION LOGIC ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // --- Frontend Validation ---
    if (!title.trim() || !description.trim() || tags.length === 0) {
      toast.error("Title, description, and at least one tag are required.");
      setIsLoading(false);
      return;
    }

    // This part is commented out because your backend gets the user ID from the request context (e.g., a cookie/JWT).
    // You don't need to fetch it from localStorage unless your API requires it in the body, which it doesn't.
    // const owner_id = localStorage.getItem("userId");
    // if (!owner_id) {
    //   toast.error("You must be logged in to report a disaster.");
    //   setIsLoading(false);
    //   return;
    // }

    try {
      const response = await fetch('http://localhost:3001/api/disasters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // If you use token-based auth, you would add your header here:
          // 'Authorization': `Bearer ${your_auth_token}`
        },
        body: JSON.stringify({
          title,
          description,
          tags,
          // owner_id is handled by the backend
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Use the error message from the backend if available
        throw new Error(responseData.message || 'An error occurred while creating the disaster.');
      }

      toast.success('Disaster reported successfully!');
      
      // Reset form state
      setTitle('');
      setDescription('');
      setTags([]);
      setCurrentTag('');

      // Call the onSuccess callback if provided
      onSuccess?.();

    } catch (error: any) {
      console.error("Submission Error:", error);
      toast.error(error.message || "Failed to submit the report.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. JSX STRUCTURE ---
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Report a New Disaster</CardTitle>
        <CardDescription>
          Fill out the details below to alert the community. Your report will be geocoded based on the description.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Wildfire near Santa Monica"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide details about the disaster, including specific locations like 'Main Street and 5th Avenue'..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
            />
          </div>

          {/* Tags Field */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (type and press Enter)</Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
              {tags.map((tag) => (
                <div key={tag} className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="rounded-full hover:bg-muted-foreground/20">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <Input
                id="tags"
                placeholder="Add tags..."
                className="flex-1 border-none shadow-none focus-visible:ring-0 h-auto p-0"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Report Disaster'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}