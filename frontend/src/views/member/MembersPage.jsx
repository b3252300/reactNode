import { useEffect, useState } from 'react';
import Card from '@/components/box/Card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShieldCheck, Mail, Calendar } from 'lucide-react';
import api from '../../api/api';

// 管理團隊名冊頁面：與後台深色黑金風格一致，展示已註冊的管理專員清單
export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      try {
        const response = await api.get('/auth/users');
        if (!cancelled) {
          setMembers(response.data.users ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError.response?.status === 401
              ? '請先登入後再查看管理團隊名冊。'
              : '無法讀取管理團隊列表，請稍後再試。'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card className="p-6 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3">
            <div className="kpi-icon-box h-11 w-11 bg-amber-500/15 text-amber-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                物業管理團隊與專員名冊
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                僅顯示系統已驗證授權之包租代管管理師公開識別資訊
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 px-3 py-1.5 text-xs dark:text-slate-300">
            授權專員總數：<strong className="text-amber-600 dark:text-amber-400 font-mono">{members.length}</strong> 位
          </div>
        </div>

        {error && (
          <p className="error-message w-full mt-4" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <div className="w-full space-y-3 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-slate-800/70 rounded-lg" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="status-message py-8 text-center w-full">
            目前沒有管理員資料。
          </p>
        ) : (
          <div className="table-wrap w-full mt-4">
            <table className="member-table">
              <thead>
                <tr>
                  <th>專員姓名</th>
                  <th>電子郵件信箱</th>
                  <th>授權職級</th>
                  <th>帳戶開通時間</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="user-photo !w-8 !h-8 !text-xs  shrink-0">
                          {(member.name || '專員').slice(0, 2)}
                        </div>
                        <span className="text-slate-900 dark:text-slate-100">
                          {member.name || '未提供名稱'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5  font-mono text-sm">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        {member.email}
                      </span>
                    </td>
                    <td>
                      <span className="badge-pill-amber gap-1 px-2.5">
                        <ShieldCheck className="w-3 h-3" />
                        {index === 0 ? '營運總監 / 管理員' : '資產管理專員'}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 font-mono text-sm">
                        <Calendar className="w-3.5 h-3.5" />
                        {member.createdAt
                          ? new Date(member.createdAt).toLocaleString('zh-TW')
                          : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
