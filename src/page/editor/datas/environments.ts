/**
 * 公共环境球数据配置
 */

const BASE_URL = './envirment';

export interface EnvironmentItem {
  id: string;
  name: string;
  hdrUrl: string;
  thumbnailUrl: string;
  fileType: string;
}

export const publicEnvironments: EnvironmentItem[] = Array.from({ length: 5 }, (_, i) => ({
  id: `public_env_${i}`,
  name: `environment${i}`,
  hdrUrl: `${BASE_URL}/environment${i}.env`,
  thumbnailUrl: `${BASE_URL}/thumbnail${i}.jpg`,
  fileType: 'env',
}));
