import { crc32 } from './crc32'

describe('crc32', () => {
    it.each([
        ['op::change_destination', 3136103846],
        ['op::upgrade', 3690657815],
        ['op::change_owner', 4058968892]
    ])('should calculate correct crc32', (input: string, output: number) => {
        expect(crc32(input)).toBe(output);
    })
})