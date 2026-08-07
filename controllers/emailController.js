const brevo = require("@getbrevo/brevo");
const client = require("../config/brevo");

exports.sendVerificationCode = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Email requis"
    });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {

    await client.transactionalEmails.sendTransacEmail({
      sender: {
        name: "ArenaFoot",
        email: "arenafoot.app@gmail.com"
      },
      to: [
        {
          email: email
        }
      ],
      subject: "Code de vérification ArenaFoot",
      htmlContent: `
        <h2>Bienvenue sur ArenaFoot ⚽</h2>
        <p>Votre code de vérification est :</p>
        <h1 style="color:#2563eb">${code}</h1>
        <p>Ce code expire dans 10 minutes.</p>
      `
    });

    res.json({
      message: "Code envoyé",
      code
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Erreur Brevo"
    });
  }
};