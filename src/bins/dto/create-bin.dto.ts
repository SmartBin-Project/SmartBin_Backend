export class CreateBinDto {
  binCode: string;
  area: string;
  location: {
    lat: number;
    lng: number;
  };
  fillLevel?: number;
  status?: 'EMPTY' | 'HALF' | 'FULL';
}
