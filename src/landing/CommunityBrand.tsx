import type { CommunityPartner } from './content'
import { ExternalIcon } from './icons'

export function CommunityLogo({ community }: { community: CommunityPartner }) {
  return (
    <div className={`community-logo ${community.logoClassName}`}>
      <img
        src={community.logo}
        alt=""
        width={community.logoWidth}
        height={community.logoHeight}
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

export function CommunityLinks({ community }: { community: CommunityPartner }) {
  return (
    <div className="community-links">
      {community.links.map((link) => (
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${link.label} de ${community.name}; se abre en una nueva pestaña`}
          key={link.url}
        >
          {link.label}
          <ExternalIcon />
        </a>
      ))}
    </div>
  )
}
