import { Router } from 'express';
import { usersRouter } from './users';
import { auth } from '../config/firebase';

const router = Router();

router.use('/users', usersRouter);

// Rota de registro
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const dominios = ['exemplo1.com', 'exemplo2.com', 'exemplo3.com'];
    const dominioUsuario = email.split('@')[1];
    
    if (!dominios.includes(dominioUsuario)) {
      // se o dominio do usuário não estiver dentre os domínios selecionados será exibida uma memsagem de erro 
      return res.status(400).json({ message: "domínio de email inválido" });
    }
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name
    });

    const token = await auth.createCustomToken(userRecord.uid);

    return res.status(201).json({
      user: {
        id: userRecord.uid,
        name: userRecord.displayName,
        email: userRecord.email
      },
      token
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Rota de login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body; 
    const dominios = ['exemplo1.com', 'exemplo2.com', 'exemplo3.com'];
    const dominioUsuario = email.split('@')[1];
    
    if (!dominios.includes(dominioUsuario)) {
      // se o dominio do usuário não estiver dentre os domínios selecionados será exibida uma memsagem de erro 
      return res.status(400).json({ message: "domínio de email inválido" });
    }

    // Aqui você normalmente usaria o método de login do Firebase 
    // Por enquanto, vamos apenas verificar se o usuário existe
    const user = await auth.getUserByEmail(email);
    
    const token = await auth.createCustomToken(user.uid);

    return res.json({
      user: {
        id: user.uid,
        name: user.displayName,
        email: user.email
      },
      token
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Tarefas prioritárias
router.post('/priority', async (req, res) => {
  try {;
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Tarefas agendadas
router.post('/schedule', async (req, res) => {
  try {;
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});


//Visualizar medicamentos, color vem NULL por padrão
//Como fazer busca por cor + nome do medicamento simultaneamente?
router.post('/viewmedicines/:color', async (req, res) => {
  //Renderizar tela dos medicamentos
  try {;
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Exibir detalhes do medicamento em específico
router.post('/viewmedicines/details/:id', async (req, res) => {
  try {;
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});


//Visualizar farmácias
router.post('/viewpharmacies', async (req, res) => {
  try {;
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Relatórios
router.post('/reports', async (req, res) => {
  try {;
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Agenda
router.post('/calendar', async (req, res) => {
  try {;
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Exibir detalhes da tarefa em questão
router.post('/calendar/:id', async (req, res) => {
  try {;
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Pacientes
router.post('/pacient', async (req, res) => {
  try {;
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Configurações
router.post('/config', async (req, res) => {
  try {;
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});


export { router }; 