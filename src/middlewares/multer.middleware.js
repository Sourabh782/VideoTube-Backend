import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "../../public/temp") // null part for error control
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
})
  
export const upload = multer({ storage }) // method to be called as middleware