import {Metrics} from "@aws-lambda-powertools/metrics";

export const metrics = new Metrics({
    namespace: 'scoring',
    serviceName: 'scoring',
});
