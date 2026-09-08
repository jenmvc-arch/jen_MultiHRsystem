import {
  addEmployeeServiceMessage,
  createEmployeeProfileChangeRequest,
  createEmployeeServiceRequest,
  listAdminEmployeeRequests,
  loadEmployeePortalBootstrap,
  loadEmployeeLeaveRequests,
  loadEmployeeLeaveWorkspace,
  createEmployeeLeaveRequest,
  markEmployeeNotificationRead,
  reopenEmployeeServiceRequest,
  processNotificationOutbox,
  updateAdminEmployeeRequest,
  updateAdminProfileChangeRequest,
  updateEmployeePortalProfile,
} from './employeeServiceServer.js';

const sendError = (res: any, error: any) => {
  const status = Number(error?.statusCode || 500);
  res.status(status).json({
    error: error instanceof Error ? error.message : 'Employee service request failed.',
  });
};

export async function handleEmployeePortalBootstrap(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await loadEmployeePortalBootstrap(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeePortalProfile(req: any, res: any) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await updateEmployeePortalProfile(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeePortalRequest(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(201).json(await createEmployeeServiceRequest(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeePortalLeaveRequests(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      res.status(200).json(await loadEmployeeLeaveRequests(req));
      return;
    }
    if (req.method === 'POST') {
      res.status(201).json(await createEmployeeLeaveRequest(req));
      return;
    }
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeePortalLeaveWorkspace(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await loadEmployeeLeaveWorkspace(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeePortalMessage(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(201).json(await addEmployeeServiceMessage(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeePortalReopen(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await reopenEmployeeServiceRequest(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeePortalProfileChange(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(201).json(await createEmployeeProfileChangeRequest(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleEmployeePortalNotificationRead(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await markEmployeeNotificationRead(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleAdminEmployeeRequests(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await listAdminEmployeeRequests(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleAdminEmployeeRequestUpdate(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await updateAdminEmployeeRequest(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleAdminProfileChangeUpdate(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await updateAdminProfileChangeRequest(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function handleAdminNotificationOutbox(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    res.status(200).json(await processNotificationOutbox(req));
  } catch (error) {
    sendError(res, error);
  }
}
