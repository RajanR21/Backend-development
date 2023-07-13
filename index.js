import express from "express";
import path from 'path';
import mongoose from "mongoose";

//how to connect to mongodb
mongoose.connect("mongodb://127.0.0.1:27017" , {
    dbname : "backend",
}).then(c => console.log("connected")).catch(e => console.log("error"))

//created a schema
const message_schema = new mongoose.Schema({
    name : String , 
    email : String ,
})

//created model
const message = mongoose.model("Message" , message_schema);

const app = express()
app.set('view engine','ejs'); 

let users = [];

//using middlewares
//app.use(express.static(path.join(path.resolve() , "public")));
app.use(express.urlencoded({extended : true}));

app.get("/" , (req , res) => {
    res.render("index" , {name : "ra"})
  //  res.sendFile("index.html");
})


app.get("/users" , (req , res) => {
    res.send({
        users,
    })
})
app.post("/" , async(req , res) => {
    await message.create({
        "name" : req.body.name,
        "email" : req.body.email,
    })
    console.log(req.body)
})

app.listen(5000  ,() => {
    console.log("working app ");
})
