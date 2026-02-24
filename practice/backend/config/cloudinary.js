import { v2 as cloudinary } from 'cloudinary';

const configureCloudinary = () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    
    console.log('✅ Cloudinary configured successfully');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    
    return cloudinary;
  } catch (error) {
    console.error('❌ Cloudinary configuration failed:', error.message);
    throw error;
  }
};

export default { configureCloudinary, cloudinary };