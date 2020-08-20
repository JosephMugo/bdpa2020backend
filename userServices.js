const userModel = require('./schemas/user'), userInformationModel = require("./schemas/userInformation")
const bycrypt = require("bcrypt")

const addUserToDatabase = async (req, res) => {
    // console.log("Request body:", req.body)
    const username = req.body.username
    const securityQuestion1 = req.body.securityQuestion1, securityQuestion2 = req.body.securityQuestion2, securityQuestion3 = req.body.securityQuestion3
    const title = req.body.title, firstName = req.body.firstName, middleName = req.body.middleName, lastName = req.body.lastName, suffix = req.body.suffix
    const sex = req.body.sex, birthdate = req.body.birthdate
    const city = req.body.city, state = req.body.state, zip = req.body.zip, country = req.body.country
    const phone = req.body.phone, email = req.body.email, password = req.body.password
    try {
        const hashedPassword = await bycrypt.hash(password, 10)
        const userCreds = new userModel({
            username, password: hashedPassword, securityQuestion1, securityQuestion2, securityQuestion3, role: "customer"
        })
        console.log("user creds: ", userCreds)
        const results = await userCreds.save()
        try {
            const userInfo = new userInformationModel({
                username, title, firstName, middleName, lastName, suffix,
                sex, birthdate,
                city, state, zip, country,
                email, phone, card: ""
            })
            console.log("user info", userInfo)
            const results = await userInfo.save()
            console.log("saved user")
            res.status(200).send("User Saved")
            return
        } catch (err) {
            console.log(err)
            await userModel.deleteOne({ username })
            if (err.code === 11000) res.status(409).json({ err })
            else res.send("Bad input")
        }
    } catch (err) {
        if (err.code === 11000) {
            res.status(409).json({ err })
            return
        }
    }
    res.status(401).send("Bad input")
}

const verifyUserCredentials = async (username, firstName, lastName, password) => {
    console.log("Credentials:", username, firstName, lastName, password)
    const user = await findUser(username)
    if (!user) return false
    const userInformation = await findUserInformation(username)
    if (!userInformation || userInformation.firstName != firstName || userInformation.lastName != lastName) return false
    const validPassword = await bycrypt.compare(password, user.password)
    if (!validPassword) return false
    console.log("valid password", validPassword)
    return user.role
}
const verifyUserSecurityQuestions = async (username, securityQuestion1, securityQuestion2, securityQuestion3) => {
    console.log("Credentials:", username, securityQuestion1, securityQuestion2, securityQuestion3)
    const user = await findUser(username)
    if (!user) return false
    const userInformation = await findUser(username)
    console.log("Real Credentials:", userInformation.username, userInformation.securityQuestion1, userInformation.securityQuestion2, userInformation.securityQuestion3)
    if (!userInformation || userInformation.securityQuestion1 != securityQuestion1 || userInformation.securityQuestion2 != securityQuestion2 || userInformation.securityQuestion3 != securityQuestion3) return false
    console.log("valid security questions")
    return user.role
}
const findUser = async username => {
    const user = await userModel.findOne({ username })
    if (user === null || user === undefined) return false
    console.log("Found user", user)
    return user
}
const findUserInformation = async username => {
    const userInfo = await userInformationModel.findOne({ username })
    if (userInfo === null || userInfo === undefined) return false
    console.log("Found user information", userInfo)
    return userInfo
}
const returnUserInformation = async (req, res) => {
    const userInfo = await findUserInformation(req.username)
    if (userInfo) {
        res.status(200).send(userInfo)
        await userInfo.update({ lastLoginDate: Date.now() })
        await userInfo.update({ lastLoginIp: req.ip })
    }
    else res.status(400).json("User info not found")
}
const updateUserInformation = async (req, res) => {
    console.log(req.username)
    let { username, ...userInfo } = req.body
    console.log(userInfo)
    userInfo = await userInformationModel.findOneAndUpdate(req.username, userInfo)
    const newUserInfo = await findUserInformation(req.username)
    console.log("newUserInfo", newUserInfo)
    res.status(200).send(newUserInfo)
}
const findUserRole = async username => {
    const userRole = await userModel.find({ username }, { role: 1, _id: 0});
    if (userRole === null || userRole === undefined) return false
    console.log("Found user role", userRole)
    return userRole
}
const returnUserRole = async (req, res) => {
    const userRole = await findUserRole(req.username)
    if (userRole) {
        res.status(200).send(userRole)
    }
    else res.status(400).json("User role no found")
}
// Retrieve all users for admin dashboard
const findAllUsers = async username => {
    const users = await userInformationModel.find()
    if (users === null || users === undefined) return false
    console.log("Found users", users)
    return users
}
const returnAllUsers = async (req, res) => {
    const users = await findAllUsers(req.username)
    if (users) {
        res.status(200).send(users)
    }
    else res.status(400).json("Users unable to be retrieved")
}
// Delete user 

module.exports = { addUserToDatabase, verifyUserCredentials, verifyUserSecurityQuestions, findUser, returnUserInformation, updateUserInformation, returnUserRole, returnAllUsers } 
