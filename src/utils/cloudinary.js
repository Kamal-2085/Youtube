import 'dotenv/config';
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const absolutePath = path.resolve(localFilePath);
        const result = await cloudinary.uploader.upload(absolutePath, {
            resource_type: 'auto',
        });
        // cleanup local file after successful upload
        try { fs.unlinkSync(localFilePath); } catch {}
        return result;
    } catch (error) {
        // cleanup local file on error
        try { if (localFilePath) fs.unlinkSync(localFilePath); } catch {}
        return null;
    }
}
export default uploadOnCloudinary;