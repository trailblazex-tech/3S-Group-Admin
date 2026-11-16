/**
 * An in-memory user directory with the same shape as aws/users.js, for local
 * dev, the guide's screenshot harness and tests. Nothing here reaches Cognito.
 */
export function createMemoryUserAdmin(accounts = []) {
  const users = new Map(accounts.map((account) => [account.username, { enabled: true, status: 'CONFIRMED', groups: [], ...account }]));
  const find = (username) => {
    const user = users.get(username);
    if (!user) throw Object.assign(new Error('User does not exist.'), { name: 'UserNotFoundException' });
    return user;
  };
  return {
    users,
    async list(_poolId, groupNames) {
      return [...users.values()].map((user) => ({ ...user, groups: user.groups.filter((group) => groupNames.includes(group)) }));
    },
    async setGroups(_poolId, username, { add = [], remove = [] }) {
      const user = find(username);
      user.groups = [...new Set([...user.groups.filter((group) => !remove.includes(group)), ...add])];
    },
    async signOutEverywhere(_poolId, username) {
      find(username);
    },
    async disable(_poolId, username) {
      find(username).enabled = false;
    },
    async enable(_poolId, username) {
      find(username).enabled = true;
    },
    async remove(_poolId, username) {
      find(username);
      users.delete(username);
    },
  };
}
