import type { PersonDto } from '../types/dto';

interface PersonCardProps {
  person: PersonDto;
  onChange: (field: keyof PersonDto, value: string) => void;
}

export function PersonCard({ person, onChange }: PersonCardProps) {
  return (
    <section className="person-card" aria-labelledby="person-card-title">
      <h2 id="person-card-title" className="person-card__title">
        Osoba
      </h2>
      <div className="person-card__inner">
        <div className="person-card__field">
          <label htmlFor="person-name" className="person-card__label">
            Ime i prezime
          </label>
          <input
            id="person-name"
            type="text"
            className="person-card__input"
            value={person.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Unesite ime i prezime"
          />
        </div>
        <div className="person-card__field">
          <label htmlFor="person-oib" className="person-card__label">
            OIB
          </label>
          <input
            id="person-oib"
            type="text"
            inputMode="numeric"
            className="person-card__input"
            value={person.oib}
            onChange={(e) => onChange('oib', e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="11 znamenki"
            maxLength={11}
          />
        </div>
        <div className="person-card__field">
          <label htmlFor="person-dob" className="person-card__label">
            Datum rođenja
          </label>
          <input
            id="person-dob"
            type="date"
            className="person-card__input"
            value={person.dateOfBirth}
            onChange={(e) => onChange('dateOfBirth', e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
