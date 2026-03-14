import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

function RubricWeightsSum(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'rubricWeightsSum',
      target: object.constructor,
      propertyName,
      constraints: [100],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const expectedSum = args.constraints[0] as number;
          if (!Array.isArray(value)) return false;
          type Item = { weight?: number };
          const sum = (value as Item[]).reduce(
            (acc: number, item: Item) =>
              acc + (typeof item.weight === 'number' ? item.weight : 0),
            0,
          );
          return sum === expectedSum;
        },
        defaultMessage(): string {
          return 'Rubric weights must sum to 100';
        },
      },
    });
  };
}

export class PersonaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  personality: string;
}

export class ScenarioContextDto {
  @IsString()
  @IsNotEmpty()
  product: string;

  @IsString()
  @IsNotEmpty()
  dealDetails: string;

  @IsString()
  @IsOptional()
  specialConditions?: string;
}

export class RubricCompetencyDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Min(1)
  @Max(100)
  weight: number;
}

export class CreateScenarioDto {
  @ValidateNested()
  @Type(() => PersonaDto)
  persona: PersonaDto;

  @ValidateNested()
  @Type(() => ScenarioContextDto)
  context: ScenarioContextDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricCompetencyDto)
  @ArrayMinSize(3)
  @ArrayMaxSize(4)
  @RubricWeightsSum({ message: 'Rubric weights must sum to 100' })
  rubric: RubricCompetencyDto[];
}
