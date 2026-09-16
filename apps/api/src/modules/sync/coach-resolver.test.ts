import { describe, expect, it } from 'vitest';
import {
  mejorNombreDeEntrenador,
  mismoApellido,
  nombreDeEntrenador,
} from './coach-resolver.service.js';

describe('nombreDeEntrenador', () => {
  it('usa el nombre completo cuando el corto viene abreviado', () => {
    expect(nombreDeEntrenador('Z. Zidane', 'Zinédine Zidane')).toBe('Zinédine Zidane');
  });

  it('prefiere el corto cuando no está abreviado, aunque el largo sea el legal', () => {
    expect(nombreDeEntrenador('José Mourinho', 'José Mário dos Santos Mourinho Félix')).toBe(
      'José Mourinho',
    );
  });

  it('se queda con lo que hay cuando no hay nombre completo', () => {
    expect(nombreDeEntrenador('E. Maresca', null)).toBe('E. Maresca');
  });
});

describe('mejorNombreDeEntrenador', () => {
  it('la alineación le gana a la ficha cuando la ficha abrevia', () => {
    expect(mejorNombreDeEntrenador('E. Maresca', 'Enzo Maresca')).toBe('Enzo Maresca');
  });

  it('el apellido suelto de la ficha no pisa al nombre entero', () => {
    expect(mejorNombreDeEntrenador('Pep Guardiola', 'Guardiola')).toBe('Pep Guardiola');
    expect(mejorNombreDeEntrenador('Guardiola', 'Pep Guardiola')).toBe('Pep Guardiola');
  });

  it('nunca vuelve a la inicial', () => {
    expect(mejorNombreDeEntrenador('Roberto De Zerbi', 'R. De Zerbi')).toBe('Roberto De Zerbi');
  });

  it('no persigue el nombre legal cuando ya hay uno entero', () => {
    expect(mejorNombreDeEntrenador('Pep Guardiola', 'Josep Guardiola i Sala')).toBe('Pep Guardiola');
  });
});

describe('mismoApellido', () => {
  it('reconoce al mismo aunque una escritura traiga el nombre de pila', () => {
    expect(mismoApellido('Guardiola', 'Pep Guardiola')).toBe(true);
    expect(mismoApellido('E. Maresca', 'Enzo Maresca')).toBe(true);
    expect(mismoApellido('Zinédine Zidane', 'Z. Zidane')).toBe(true);
  });

  it('separa a dos personas distintas del mismo club', () => {
    expect(mismoApellido('Marcelo Salles', 'Filipe Luís Kasmirski')).toBe(false);
    expect(mismoApellido('Simone Inzaghi', 'Cristian Eugen Chivu')).toBe(false);
  });

  it('encuentra el apellido aunque quede en medio del nombre completo', () => {
    expect(mismoApellido('Guardiola', 'Josep Guardiola i Sala')).toBe(true);
    expect(mismoApellido('Pep Guardiola', 'Josep Guardiola i Sala')).toBe(true);
  });

  it('no hermana a dos que solo comparten el nombre de pila', () => {
    expect(mismoApellido('Marcelo Salles', 'Marcelo Gallardo')).toBe(false);
  });
});
