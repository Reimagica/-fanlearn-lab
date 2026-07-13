import Link from 'next/link'
import { LAB_INFO } from '@/lib/mock-data'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Lab info */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text-strong">FanLearn Lab · 泛学习实验室</h3>
            <p className="text-xs leading-relaxed text-text-muted">{LAB_INFO.description}</p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text-strong">快速导航</h3>
            <ul className="space-y-1.5">
              {[
                { href: '/team', label: '团队成员' },
                { href: '/publications', label: '学术成果' },
                { href: '/news', label: '课题组动态' },
                { href: '/chat', label: 'AI 助手' },
                { href: '/login', label: '成员登录' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs text-text-muted hover:text-text transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text-strong">联系我们</h3>
            <p className="text-xs text-text-muted">{LAB_INFO.university} · {LAB_INFO.department}</p>
            <p className="mt-1 text-xs text-text-muted">{LAB_INFO.location}</p>
            <a
              href={`mailto:${LAB_INFO.contactEmail}`}
              className="mt-2 block text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {LAB_INFO.contactEmail}
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-xs text-text-faint">
            © {new Date().getFullYear()} FanLearn Lab · 泛学习实验室 · {LAB_INFO.university} {LAB_INFO.department}
          </p>
        </div>
      </div>
    </footer>
  )
}
