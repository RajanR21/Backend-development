import express from "express";
import path from 'path';
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import bodyParser from 'body-parser';
import multer from "multer";
import fs from "fs";
import {createCanvas, loadImage, ImageData} from 'canvas';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';



// ... (the rest of your code)

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Mongoose connection
mongoose.connect("mongodb://127.0.0.1:27017/backend", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
  .catch(error => console.error("MongoDB connection error:", error));

// Define a schema for storing messages
const messageSchema = new mongoose.Schema({
    username: String,
    email: String,
    username: String,
    password: String,
});

const Message = mongoose.model("Message", messageSchema);

// Define a schema for storing images
const imgSchema = new mongoose.Schema({
    email: String,
    org_otp: String, // Add org_otp field
    imagestr: String,
    img: {
        data: Buffer,
        contentType: String
    }
});

const ImgModel = mongoose.model("Image", imgSchema);

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors());


app.get("/", async (req, res, next) => {
    const { token } = req.cookies

    if (token) {
        const decoded = jwt.verify(token, "vuydwvysdvqvwwdvs");
        console.log(decoded._id);

        req.user = await Message.findById(decoded._id);
        next();
    }
    else {
        res.render("login");
    }
}, (req, res) => {
    res.render("logout", { name: req.user.name });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/logout", (req, res) => {
    res.cookie("token", null, {
        httpOnly: true,
        expires: new Date(Date.now()),
    });
    res.redirect('http://localhost:3000/');
    //window.location.href = 'http://localhost:3000/';
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    let userExist = await Message.findOne({username});

    if (!userExist) return res.redirect("/register");

    let isSamePass = await bcrypt.compare(password, userExist.password);

    if (!isSamePass) {
        return res.render("login", { name: "Incorrect password" });
    } else {
        const token = jwt.sign({ _id: userExist._id }, "vuydwvysdvqvwwdvs");
        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 60 * 1000),
        });

        res.redirect("http://localhost:5003/");
    }
});

app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    let userExist = await Message.findOne({ username });

    if (userExist) {
        alert("you are an already registered user, redirecting to Login page !")
        return res.redirect("/login");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Message.create({
        "username": username,
        "email": email,
        "password": hashedPassword,
    });

    res.redirect("/login");
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now());
    }
});

var upload = multer({ storage: storage });
var email;
let fetchedBuffer = null;
let share2str;
app.get('/image', (req, res) => {
    email = req.query.email;
    console.log("printing email : ", email);

    // Find the image by email in the ImgModel database
    ImgModel.findOne({ email })
        .then(data => {
            if (!data) {
                return res.status(404).send("you are new user, so please first open the link in you email and then reload this page !");
            }

            const org_otp = data.org_otp; // Get org_otp from the image data
            share2str = data.imagestr;
         
            // Fetch images for the email
            ImgModel.find({ email })
                .then((data, err) => {
                    if (err) {
                        console.log(err);
                    }
                    res.render('imagepage', { items: data, org_otp }); // Pass org_otp to the frontend
                })
                .catch(err => {
                    console.error(err);
                    res.status(500).send("Internal Server Error");
                });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Internal Server Error due to image not found");
        });
});

//----------------------------------uploaded image canvas-----------------------------//
// Access the currentURL variable from the global scope
// Assuming you have a decryption function named 'decryptImage' that takes an encrypted image buffer and returns a decrypted buffer
async function createCanvasFromImageBuffer(imageBuffer) {
    const canvas = createCanvas(150, 50); // Replace with your desired canvas size

    // Get the 2D context of the canvas
    const ctx = canvas.getContext('2d');

    try {
        // Load the image from the buffer using loadImage
        //console.log(imageBuffer);
        const image = await loadImage(imageBuffer);

        // Draw the image on the canvas
        ctx.drawImage(image, 0, 0); // You can specify the position and size here

        return canvas;
    } catch (error) {
        console.error('Error loading image:', error);
        throw error;
    }
  }

  //-----------------------fetched image canvas----------------------------------
  async function createCanvasFromDatabaseImage(databaseImage) {
    // Assuming databaseImage is a buffer containing the image data
    console.log("sab thik h ");
    const canvas = createCanvas(150, 50); // Replace with your desired canvas size

    // Get the 2D context of the canvas
    const ctx = canvas.getContext('2d');

    try {
        // Load the image from the buffer using loadImage
        const image = await loadImage(databaseImage);

        // Draw the image on the canvas
        ctx.drawImage(image, 0, 0); // You can specify the position and size here

        return canvas;
    } catch (error) {
        console.error('ma chud gayi share 2 ki :', error);
        throw error;
    }
  }

//   //------------------------decryption---------------------------------

async function xorCanvases(canvas1, canvas2) {
    const width = canvas1.width;
    const height = canvas1.height;
  
    // Create a new canvas to store the result
    const resultCanvas = createCanvas(width, height);
    const ctx = resultCanvas.getContext('2d');
  
    // Get the ImageData objects for both canvases
    const imageData1 = canvas1.getContext('2d').getImageData(0, 0, width, height);
    const imageData2 = canvas2.getContext('2d').getImageData(0, 0, width, height);
    
   // console.log("image 1 data : ", imageData1);
   // console.log("image 2 data : ", imageData2);
    // Create a new ImageData object to store the result
    const resultImageData = new ImageData(width, height);
  
    // Perform the XOR operation pixel by pixel
    for (let i = 0; i < imageData1.data.length; i+=4) {
      resultImageData.data[i] = imageData1.data[i] ^ imageData2.data[i];
      resultImageData.data[i+1] = imageData1.data[i+1] ^ imageData2.data[i+1];
      resultImageData.data[i+2] = imageData1.data[i+2] ^ imageData2.data[i+2];
      resultImageData.data[i+3] = 255;

    }
  
    // Put the resultImageData onto the resultCanvas
   // console.log("isko check kar mc : ", resultImageData);
    ctx.putImageData(resultImageData, 0, 0);
  
    return resultCanvas;
  }
app.post('/image', upload.single('image'), async(req, res) => {
    
    // Check if fetchedBuffer is not null (image data was fetched previously)
    const uploadedImageBuffer = fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)) ;
    const abc = uploadedImageBuffer.toString('base64');
    //console.log("uploaded string :",abc)
    console.log("uploaded image buffer : ", uploadedImageBuffer);
    const fileCanvas = await createCanvasFromImageBuffer(uploadedImageBuffer);
    const fetchedBuffer = Buffer.from(share2str.split(',')[1], 'base64');
    
    if (!fetchedBuffer) {
        return res.status(404).send("fetched Image data not found through app post.");
    }
    else{
        console.log("app.post s fetch buffer",fetchedBuffer);
    }

   const databaseCanvas = await createCanvasFromDatabaseImage(fetchedBuffer);

    const xorResultCanvas = await xorCanvases(fileCanvas, databaseCanvas);

    const xorResultImageData = xorResultCanvas.toDataURL('image/png');
    const xorResultBuffer = Buffer.from(xorResultImageData.split(',')[1], 'base64');
    res.send(xorResultBuffer);
});

// ... (your other middleware and routes)




app.listen(5002, err => {
    if (err)
        throw err;
    console.log('Server listening on port', 5002);
});