import { PartialType } from '@nestjs/swagger';
import { CreateShortnerDto } from './create-shortner.dto';

export class UpdateShortnerDto extends PartialType(CreateShortnerDto) {}
