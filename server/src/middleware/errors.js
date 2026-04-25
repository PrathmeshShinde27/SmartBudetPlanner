export function notFound(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(error, req, res, next) {
  if (error?.name === 'ZodError') {
    return res.status(400).json({
      message: 'Validation failed',
      issues: error.issues
    });
  }

  if (error?.code === '23505') {
    return res.status(409).json({ message: 'A record with this value already exists' });
  }

  if (error?.code === '23503') {
    return res.status(400).json({ message: 'Related record does not exist' });
  }

  console.error(error);
  return res.status(error.status || 500).json({
    message: error.expose ? error.message : 'Internal server error'
  });
}
