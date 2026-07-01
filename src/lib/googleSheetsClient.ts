import { Employee, EmployeePerformance, CorporateEntity } from '../types';

const googleScriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';

export const isGoogleConfigured = !!googleScriptUrl && !googleScriptUrl.includes('placeholder') && googleScriptUrl.trim() !== '';

if (!isGoogleConfigured) {
  console.warn(
    '[Google Sheets Config] Missing VITE_GOOGLE_SCRIPT_URL in your .env.local file. ' +
    'The app will fall back to local mock data until configuration is completed.'
  );
}

// Interface for what doGet returns
export interface SheetsDataPayload {
  corporate_entities: any[];
  employees: any[];
  performances: any[];
  users: any[];
  audit_logs: any[];
  candidates?: any[];
}

export const googleSheetsClient = {
  async loadData(): Promise<SheetsDataPayload> {
    if (!isGoogleConfigured) {
      throw new Error('Google Sheets client is not configured.');
    }
    const response = await fetch(googleScriptUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to load data from Google Sheets');
    }
    return result.data;
  },

  async insert(sheetName: string, data: any): Promise<void> {
    if (!isGoogleConfigured) return;
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'insert',
        sheetName,
        data
      }),
      redirect: 'follow'
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || `Failed to insert record into ${sheetName}`);
    }
  },

  async update(sheetName: string, keyValue: string, data: any, keyName: string = 'id'): Promise<void> {
    if (!isGoogleConfigured) return;
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        sheetName,
        keyName,
        keyValue,
        data
      }),
      redirect: 'follow'
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || `Failed to update record in ${sheetName}`);
    }
  },

  async delete(sheetName: string, keyValue: string, keyName: string = 'id'): Promise<void> {
    if (!isGoogleConfigured) return;
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        sheetName,
        keyName,
        keyValue
      }),
      redirect: 'follow'
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || `Failed to delete record from ${sheetName}`);
    }
  },

  async upsert(sheetName: string, query: Record<string, string>, data: any): Promise<void> {
    if (!isGoogleConfigured) return;
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert',
        sheetName,
        query,
        data
      }),
      redirect: 'follow'
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || `Failed to upsert record in ${sheetName}`);
    }
  },

  async uploadFile(file: File): Promise<string> {
    if (!isGoogleConfigured) {
      throw new Error('Google Sheets client is not configured.');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const response = await fetch(googleScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upload_file',
              base64,
              filename: file.name,
              contentType: file.type
            }),
            redirect: 'follow'
          });
          const result = await response.json();
          if (result.success && result.url) {
            resolve(result.url);
          } else {
            reject(new Error(result.error || 'Failed to upload file to Google Drive'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
};
