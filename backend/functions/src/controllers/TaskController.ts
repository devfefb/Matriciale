import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { Task } from '../interfaces/Task';

const firestore = getFirestore();

export class TaskController {
  async create(req: Request, res: Response) {
    try {
      const { label, color, bgColor, date, municipio } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const taskData: Task = {
        label,
        color,
        bgColor,
        date,
        municipio,
        createdBy: userId,
        createdAt: new Date(),
      };

      const municipioRef = firestore.collection('municipio').doc(municipio);
      const tarefasRef = municipioRef.collection('tarefas');
      
      const docRef = await tarefasRef.add(taskData);
      
      return res.status(201).json({ 
        id: docRef.id,
        ...taskData 
      });
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async listByMunicipio(req: Request, res: Response) {
    try {
      const { municipio } = req.params;
      
      const municipioRef = firestore.collection('municipio').doc(municipio);
      const tarefasRef = municipioRef.collection('tarefas');
      
      const snapshot = await tarefasRef.orderBy('date', 'asc').get();
      
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return res.json(tasks);
    } catch (error: any) {
      console.error('Erro ao listar tarefas:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}