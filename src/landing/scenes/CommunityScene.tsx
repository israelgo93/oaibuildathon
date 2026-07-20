import {
  coorganizingCommunities,
  officialSponsor,
  organizingCommunity,
  venuePartner,
} from '../content'
import { CommunityLinks, CommunityLogo } from '../CommunityBrand'

export function CommunityScene() {
  return (
    <section className="community-section" id="comunidades" aria-labelledby="community-title">
      <div className="page-shell community-shell">
        <div className="community-heading">
          <h2 className="section-mark" id="community-title">Organización y comunidades</h2>
          <p>
            OpenAI Build Week Portoviejo es organizada por The Builders junto al programa Codex
            Ambassadors e impulsada por Codex Community. Kriuu y Club IA ULEAM participan como
            comunidades coorganizadoras.
          </p>
        </div>

        <article className="community-recognition community-sponsor" aria-labelledby="sponsor-title">
          <p className="community-role">Sponsor oficial</p>
          <h3 className="sr-only" id="sponsor-title">{officialSponsor.name}</h3>
          <CommunityLogo community={officialSponsor} />
        </article>

        <article className="community-primary">
          <CommunityLogo community={organizingCommunity} />
          <div className="community-copy">
            <p className="community-role">Organización principal</p>
            <h3>{organizingCommunity.name}</h3>
            <p>{organizingCommunity.description}</p>
          </div>
          <CommunityLinks community={organizingCommunity} />
        </article>

        <div className="community-coorganizers">
          <p className="community-group-label">Comunidades coorganizadoras</p>
          <ul className="community-list">
            {coorganizingCommunities.map((community) => (
              <li className="community-item" key={community.name}>
                <CommunityLogo community={community} />
                <div className="community-copy">
                  <h3>{community.name}</h3>
                  <p>{community.description}</p>
                </div>
                <CommunityLinks community={community} />
              </li>
            ))}
          </ul>
        </div>

        <div className="community-venue" aria-labelledby="venue-title">
          <p className="community-group-label">Sede</p>
          <article className="community-recognition community-venue-card">
            <h3 className="sr-only" id="venue-title">{venuePartner.name}</h3>
            <CommunityLogo community={venuePartner} />
          </article>
        </div>
      </div>
    </section>
  )
}
