
const nodemailer = require('nodemailer');

async function testPostmark() {
  const config = {
    host: 'smtp.postmarkapp.com',
    port: 587,
    auth: {
      user: '08477a44-da72-4d7d-90e8-4b376a3dba22',
      pass: '08477a44-da72-4d7d-90e8-4b376a3dba22'
    }
  };

  console.log('--- TESTE DE CREDENCIAIS POSTMARK ---');
  console.log(`Host: ${config.host}`);
  console.log(`Porta: ${config.port}`);
  console.log(`Usuário: ${config.auth.user}`);
  
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: false, // STARTTLS
    auth: config.auth,
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Verificando conexão...');
    await transporter.verify();
    console.log('✅ Conexão SMTP estabelecida com sucesso!');

    console.log('Enviando e-mail de teste...');
    const info = await transporter.sendMail({
      from: 'noreply@conext.click',
      to: 'noreply@conext.click', // Enviando para o próprio para testar
      subject: 'Teste Postmark - Conext Hub',
      text: 'Se você recebeu este e-mail, as credenciais do Postmark estão funcionando perfeitamente.',
      html: '<strong>Se você recebeu este e-mail, as credenciais do Postmark estão funcionando perfeitamente.</strong>'
    });

    console.log('✅ E-mail enviado com sucesso!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ ERRO NO TESTE DE SMTP:');
    console.error(error.message);
    if (error.response) console.error('Resposta do Servidor:', error.response);
  }
}

testPostmark();
