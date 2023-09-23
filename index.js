import express from "express";
import path from 'path';
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import bodyParser from 'body-parser';
import multer from "multer";
import fs from "fs";

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
    res.redirect("/");
});
let globalImageData = null;
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

app.get('/image', (req, res) => {
    email = req.query.email;
    console.log("printing email : ", email);

    // Find the image by email in the ImgModel database
    ImgModel.findOne({ email })
        .then(data => {
            if (!data) {
                return res.status(404).send("Image not found in db !");
            }

            const org_otp = data.org_otp; // Get org_otp from the image data
            //console.log("mc check",data.img.data);
            fetchedBuffer = Buffer.from(data.img.data.buffer);;
            
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


// Access the currentURL variable from the global scope
// Assuming you have a decryption function named 'decryptImage' that takes an encrypted image buffer and returns a decrypted buffer

app.post('/image', upload.single('image'), (req, res) => {
    
    // Check if fetchedBuffer is not null (image data was fetched previously)
    if (!fetchedBuffer) {
        return res.status(404).send("fetched Image data not found through app post.");
    }
    else{
        console.log("app.post s fetch buffer",fetchedBuffer);
    }

    // Get the uploaded image buffer
    const uploadedImageBuffer = fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename));
    console.log("yeh uploaded image", uploadedImageBuffer);
    // Ensure both images have the same dimensions
    
    // if (uploadedImageBuffer.length !== fetchedBuffer.length) {
    //     return res.status(402).send("ma chud gayi Image dimensions do not match.");
    // }
    // else{
    //     console.log("fetch ki length",fetchedBuffer.length);
    //     console.log("uploaded ki length",uploadedImageBuffer.length);
    // }

    // Perform pixel-by-pixel XOR decryption
    let decryptedImageData = Buffer.alloc(uploadedImageBuffer.length);

    for (let i = 0; i < uploadedImageBuffer.length; i++) {
        decryptedImageData[i] = uploadedImageBuffer[i] ^ fetchedBuffer[i];
    }
    console.log("yeh decrypted buffer",decryptedImageData);
    // Set the content type to 'image/png' (or appropriate format)
//     const base64ImageDataWithPrefix = fetchedBuffer.toString('base64');
//     //const base64ImageData = base64ImageDataWithPrefix.split(',')[1];
//  console.log("app post s base6e string : ", base64ImageDataWithPrefix);
// Send the base64 string as a response
// res.send(decryptedImageData);
const base64ImageData = `data:image/png;base64,${uploadedImageBuffer.toString('base64')}`;
console.log("app post s ", base64ImageData);
  // Send an HTML response with an img tag containing the image data URL
  res.send(`<img src="${base64ImageData}" alt="Image">`);
});

// ... (your other middleware and routes)




app.listen(5002, err => {
    if (err)
        throw err;
    console.log('Server listening on port', 5002);
});