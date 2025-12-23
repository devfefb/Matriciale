import { MedicineRepository } from '../repositories/MedicineRepository';

export class MedicineService {
  private medicineRepository: MedicineRepository;

  constructor() {
    this.medicineRepository = new MedicineRepository();
  }

  getMunicipio(email: string | undefined): string | null {
    console.log(`[DEBUG] getMunicipio called with email: ${email}`);
    if (!email) return null;
    const normalizedEmail = email.toLowerCase();

    const PALMARES = ['gustavo.moraes@beetsjr.com.br', 'andre.ricardo.goncales@gmail.com'];
    const PIRANGI = ['andre.ricardo.goncales@gmail.com'];

    if (PALMARES.includes(normalizedEmail)) {
      console.log('[DEBUG] Municipality found: Palmares');
      return 'Palmares';
    }
    if (PIRANGI.includes(normalizedEmail)) {
      console.log('[DEBUG] Municipality found: Pirangi');
      return 'Pirangi';
    }

    console.log('[DEBUG] Municipality NOT found for email');
    return null;
  }

  async getGeneralTable(email: string) {
    const municipio = this.getMunicipio(email);
    if (!municipio) throw new Error('Município não encontrado para este usuário.');

    const medicines = await this.medicineRepository.getMedicinesByUnit(municipio, 'CAF');

    const mappedMedicines = medicines.map((med: any) => {
      
      // Calcula o status (semanas de estoque) de forma correta
      let status = 0;
      
      if (med.estoque === 0) {
        // Estoque zerado = status 0
        status = 0;
      } else {
        // Ambos positivos = calcula normalmente (estoque / método)
        status = med.estoque / med.metodo;
      }
      
      return {
        id: med.id,
        cod_item: med.cod_item,
        nome: med.nome,
        classificacao: med.classificacao,
        tp_metodo: med.tp_metodo,
        tp_unidade_medicamento: med.tp_unidade_medicamento,
        estoque: med.estoque,
        status: Math.floor(status),
        metodo: med.metodo,
        // Indica se é inativo para facilitar a classificação no frontend
        isInativo: med.tp_metodo === "3.INATIVOS"
      };
    });

    return {
      municipality: municipio,
      medicines: mappedMedicines
    };
  }

  async getMedicineDetails(email: string, medicineId: string) {
    const municipio = this.getMunicipio(email);
    if (!municipio) throw new Error('Município não encontrado para este usuário.');

    const units = await this.medicineRepository.getAllUnits(municipio);

    const details = [];
    const cafData = await this.medicineRepository.getMedicineInUnit(municipio, 'CAF', medicineId);
    if (cafData) {
      details.push({
        unidade: 'CAF',
        nome: cafData.nome,
        estoque: cafData.estoque,
        met_est: cafData.met_est,
        reposicao: cafData.reposicao
      });
    }

    for (const unit of units) {
      if (unit.id === 'CAF') continue;

      const unitMed = await this.medicineRepository.getMedicineInUnit(municipio, unit.id, medicineId);
      if (unitMed) {
        details.push({
          unidade: unit.id,
          nome: unitMed.nome,
          estoque: unitMed.estoque,
          met_est: unitMed.met_est,
          reposicao: unitMed.reposicao
        });
      }
    }

    return details;
  }

  async getUnits(email: string) {
    console.log(`[DEBUG] getUnits called for email: ${email}`);
    const municipio = this.getMunicipio(email);
    if (!municipio) {
      console.error('[DEBUG] Municipality not found in getUnits');
      throw new Error('Município não encontrado para este usuário.');
    }

    const units = await this.medicineRepository.getAllUnits(municipio);
    console.log(`[DEBUG] Units fetched from repo for ${municipio}:`, units.map(u => u.id));
    return units.map(u => u.id);
  }

  async getMedicinesForReport(email: string, unit: string) {
    const municipio = this.getMunicipio(email);
    if (!municipio) throw new Error('Município não encontrado para este usuário.');

    const medicines = await this.medicineRepository.getMedicinesByUnit(municipio, unit);

    return medicines.map((med: any) => ({
      id: med.id,
      classificacao: med.classificacao,
      cod_item: med.cod_item,
      nome_item: med.nome,
      tp_metodo: med.tp_metodo,
      metodo: med.metodo,
      met_est: med.met_est,
      estoque: med.estoque,
      reposicao: med.reposicao
    }));
  }
}
