import { db } from '../config/firebase';

export interface MedicineData {
  id: string;
  nome: string;
  estoque: number;
  met_est?: number;
  reposicao?: number;
  cod_item?: string;
  classificacao?: string;
  tp_metodo?: number;
  tp_unidade_medicamento?: string;
  [key: string]: any;
}

export class MedicineRepository {
  async getMedicinesByUnit(municipio: string, unit: string): Promise<MedicineData[]> {
    const snapshot = await db.collection(`municipio/${municipio}/unidades/${unit}/medicamentos_unidade`).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicineData));
  }

  async getAllUnits(municipio: string) {
    const snapshot = await db.collection(`municipio/${municipio}/unidades`).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getMedicineInUnit(municipio: string, unit: string, medicineId: string): Promise<MedicineData | null> {
    const doc = await db.doc(`municipio/${municipio}/unidades/${unit}/medicamentos_unidade/${medicineId}`).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as MedicineData;
  }
}
