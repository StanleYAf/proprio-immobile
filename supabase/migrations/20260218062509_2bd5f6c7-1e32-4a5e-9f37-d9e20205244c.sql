
-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

-- Allow anyone to upload images
CREATE POLICY "Anyone can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-images');

-- Allow anyone to view property images
CREATE POLICY "Anyone can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

-- Allow anyone to delete their uploaded images
CREATE POLICY "Anyone can delete property images"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-images');
