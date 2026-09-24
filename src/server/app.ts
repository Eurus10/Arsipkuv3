import { app } from '../../api/index.ts';
import { registerPrintGatewayRoutes } from './printGatewayRoutes';

registerPrintGatewayRoutes(app);

export { app };
export default app;