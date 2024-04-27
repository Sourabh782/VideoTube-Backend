import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath){
            return null;
        }

        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        // file has been uploaded successfully
        // console.log("file uploaded on cloudinary");
        // console.log(response.url);

        // console.log(response);

        fs.unlinkSync(localFilePath)

        console.log(response)

        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // removes the locally saved temp file as upload failed
    }
}

const deleteFromCloudinary = async (publicId, type) => {
    try {
        if(!publicId){
            return null;
        }

        if(type === "video"){
            const response = await cloudinary.uploader.destroy(publicId, {
                resource_type: "video"
            });

            return response
        }

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image"
        });

        return response

    } catch (error) {
        console.log(error.message)
    }

}

export { uploadOnCloudinary, deleteFromCloudinary }
