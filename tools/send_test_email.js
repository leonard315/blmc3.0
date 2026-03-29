import nodemailer from 'nodemailer';

(async ()=>{
  try{
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });

    const info = await transporter.sendMail({
      from: testAccount.user,
      to: 'demo.user@example.com',
      subject: 'Ethereal Test Message (demo)',
      html: '<p>This is a test email sent via Ethereal for verification.</p>'
    });

    console.log('Sent. Preview URL:', nodemailer.getTestMessageUrl(info));
  }catch(err){
    console.error('Failed to send test email:', err);
    process.exit(1);
  }
})();
