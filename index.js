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
app.get('/image', (req, res) => {
    email = req.query.email;
    console.log("printing email : ",email);

    ImgModel.find({})
        .then((data, err) => {
            if (err) {
                console.log(err);
            }
            res.render('imagepage', { items: data });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Internal Server Error");
        });
});

// Access the currentURL variable from the global scope
app.post('/image', upload.single('image'), (req, res) => {
    
    var obj = {
        //name: req.body.name,
        email: email,
        
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        }
    };

    ImgModel.create(obj)
        .then(() => {
            res.redirect('/image');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Internal Server Error");
        });
});
// ... (your other middleware and routes)




app.listen(5002, err => {
    if (err)
        throw err;
    console.log('Server listening on port', 5002);
});