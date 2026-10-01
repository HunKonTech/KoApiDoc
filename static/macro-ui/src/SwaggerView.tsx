import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function SwaggerView({ spec }: { spec: Record<string, unknown> }) {
  return (
    <div className="ko-swagger">
      <SwaggerUI
        spec={spec}
        // Step 1 is read-only: no "Try it out", no network.
        supportedSubmitMethods={[]}
        docExpansion="list"
      />
    </div>
  );
}
