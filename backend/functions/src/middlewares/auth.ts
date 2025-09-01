import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Verificar se a autenticação está desabilitada para desenvolvimento
    if (process.env.DISABLE_AUTH === 'true') {
      console.log('🔓 [AUTH] Autenticação desabilitada - modo desenvolvimento');
      req.user = {
        id: 'dev-user',
        email: 'dev@test.com',
        role: 'admin',
      };
      return next();
    }

    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      console.log('❌ [AUTH] Token não fornecido');
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || 'user',
      };
      console.log('✅ [AUTH] Token válido para usuário:', req.user.email);
      return next();
    } catch (error) {
      console.log('❌ [AUTH] Token inválido:', error);
      return res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error: any) {
    console.error('❌ [AUTH] Erro no middleware de autenticação:', error);
    return res.status(500).json({ error: error.message });
  }
} 