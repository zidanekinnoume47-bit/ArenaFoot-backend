const transporter = require("../config/mailer");

exports.sendVerificationCode = async (req, res) => {

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: "Email requis"
        });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    try {

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Code de vérification ArenaFoot",
            html: `
                <h2>Bienvenue sur ArenaFoot ⚽</h2>
                <p>Votre code de vérification est :</p>

                <h1 style="color:#2563eb;">${code}</h1>

                <p>Ce code est valable 10 minutes.</p>
            `
        });

        res.json({
            message: "Code envoyé",
            code
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Impossible d'envoyer l'email"
        });

    }

};