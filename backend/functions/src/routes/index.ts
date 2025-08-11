import { Router } from 'express';
import { usersRouter } from './users';
import { auth } from '../config/firebase';

const router = Router();

// a ideia desse arquivo não seria possuir todas as rotas, precisamos modularizar as rotas em arquivos separados

router.use('/users', usersRouter); // assim como esse exemplo, onde as rotas de usuários estão em um arquivo separado, e apenas usamos 'router.use' para importar as rotas

// Rota de registro
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const dominios = ['exemplo1.com', 'exemplo2.com', 'exemplo3.com', 'beetsjr.com.br'];
    const dominioUsuario = email.split('@')[1];
    if (!dominios.includes(dominioUsuario)) {
      // se o dominio do usuário não estiver dentre os domínios selecionados será exibida uma memsagem de erro 
      return res.status(400).json({ message: 'domínio de email inválido' });
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
    const dominios = ['exemplo1.com', 'exemplo2.com', 'exemplo3.com', 'beetsjr.com.br'];
    const dominioUsuario = email.split('@')[1];
    
    if (!dominios.includes(dominioUsuario)) {
      // se o dominio do usuário não estiver dentre os domínios selecionados será exibida uma memsagem de erro 
      return res.status(400).json({ message: 'domínio de email inválido' });
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
  try {
    const { task } = req.body;
    // Aqui você pode adicionar lógica para salvar a tarefa prioritária no banco de dados
    // Por enquanto, vamos apenas retornar a tarefa recebida
    return res.status(201).json({ message: 'Tarefa prioritária adicionada', task });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Tarefas agendadas
router.post('/schedule', async (req, res) => {
  try {
    const { task, date } = req.body;
    // Aqui você pode adicionar lógica para salvar a tarefa agendada no banco de dados
    // Por enquanto, vamos apenas retornar a tarefa e a data recebida
    return res.status(201).json({ message: 'Tarefa agendada adicionada', task, date });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});


//Visualizar medicamentos, color vem NULL por padrão
//Como fazer busca por cor + nome do medicamento simultaneamente?
router.post('/viewmedicines/:color', async (req, res) => {
  //Renderizar tela dos medicamentos
  try {
    const { color } = req.params;
    const { name } = req.body; // Nome do medicamento pode ser passado no corpo da requisição

    // Aqui você pode adicionar lógica para buscar medicamentos no banco de dados
    // Por enquanto, vamos apenas retornar os parâmetros recebidos
    return res.status(200).json({ message: 'Medicamentos visualizados', color, name });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Exibir detalhes do medicamento em específico
router.post('/viewmedicines/details/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Aqui você pode adicionar lógica para buscar detalhes do medicamento no banco de dados
    // Por enquanto, vamos apenas retornar o ID recebido
    return res.status(200).json({ message: 'Detalhes do medicamento visualizados', id });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});


//Visualizar farmácias
router.post('/viewpharmacies', async (req, res) => {
  try {
    // Aqui você pode adicionar lógica para buscar farmácias no banco de dados
    // Por enquanto, vamos apenas retornar uma mensagem de sucesso
    return res.status(200).json({ message: 'Farmácias visualizadas' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Relatórios
router.post('/reports', async (req, res) => {
  try {
    // Aqui você pode adicionar lógica para gerar relatórios
    // Por enquanto, vamos apenas retornar uma mensagem de sucesso
    return res.status(200).json({ message: 'Relatórios gerados' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Agenda
router.post('/calendar', async (req, res) => {
  try {
    const { task, date } = req.body;
    // Aqui você pode adicionar lógica para salvar a tarefa no calendário
    // Por enquanto, vamos apenas retornar a tarefa e a data recebida
    return res.status(201).json({ message: 'Tarefa adicionada ao calendário', task, date });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Exibir detalhes da tarefa em questão
router.post('/calendar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Aqui você pode adicionar lógica para buscar detalhes da tarefa no calendário
    // Por enquanto, vamos apenas retornar o ID recebido
    return res.status(200).json({ message: 'Detalhes da tarefa visualizados', id });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Pacientes
router.post('/pacient', async (req, res) => {
  try {
    const { name, age, medicalHistory } = req.body;
    // Aqui você pode adicionar lógica para salvar o paciente no banco de dados
    // Por enquanto, vamos apenas retornar os dados do paciente recebidos
    return res.status(201).json({ message: 'Paciente adicionado', patient: { name, age, medicalHistory } });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

//Configurações
router.post('/config', async (req, res) => {
  try {
    const { settings } = req.body;
    // Aqui você pode adicionar lógica para salvar as configurações no banco de dados
    // Por enquanto, vamos apenas retornar as configurações recebidas
    return res.status(200).json({ message: 'Configurações salvas', settings });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export { router }; 