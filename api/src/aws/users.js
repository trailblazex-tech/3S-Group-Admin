/**
 * The Users page's directory work against the Cognito user pool, and the
 * email the main admin gets when someone asks for access (an SNS topic with
 * the main admin's address subscribed; infra/template.yaml).
 *
 * The SDK clients come from the Lambda runtime (see api/build.mjs) and are
 * loaded on first use, so nothing else in the API pays for them.
 */
const region = process.env.AWS_REGION || 'eu-north-1';

let cognitoClient;
async function cognito() {
  if (!cognitoClient) {
    const sdk = await import('@aws-sdk/client-cognito-identity-provider');
    cognitoClient = { sdk, client: new sdk.CognitoIdentityProviderClient({ region }) };
  }
  return cognitoClient;
}

const attribute = (user, name) => (user.Attributes ?? user.UserAttributes ?? []).find((entry) => entry.Name === name)?.Value;

export function createCognitoUserAdmin() {
  return {
    /** Every account, each with the groups (of `groupNames`) it is in. */
    async list(poolId, groupNames) {
      const { sdk, client } = await cognito();
      const accounts = [];
      let PaginationToken;
      do {
        const page = await client.send(new sdk.ListUsersCommand({ UserPoolId: poolId, Limit: 60, PaginationToken }));
        for (const user of page.Users ?? []) {
          accounts.push({
            username: user.Username,
            email: attribute(user, 'email'),
            name: attribute(user, 'name'),
            status: user.UserStatus,
            enabled: user.Enabled !== false,
            createdAt: user.UserCreateDate ? new Date(user.UserCreateDate).toISOString() : null,
            groups: [],
          });
        }
        PaginationToken = page.PaginationToken;
      } while (PaginationToken);

      const byName = new Map(accounts.map((account) => [account.username, account]));
      for (const GroupName of groupNames) {
        let NextToken;
        do {
          let page;
          try {
            page = await client.send(new sdk.ListUsersInGroupCommand({ UserPoolId: poolId, GroupName, Limit: 60, NextToken }));
          } catch (error) {
            if (error.name === 'ResourceNotFoundException') break; // a site whose group is not made yet
            throw error;
          }
          for (const user of page.Users ?? []) byName.get(user.Username)?.groups.push(GroupName);
          NextToken = page.NextToken;
        } while (NextToken);
      }
      return accounts;
    },

    async setGroups(poolId, username, { add = [], remove = [] }) {
      const { sdk, client } = await cognito();
      for (const GroupName of add) {
        try {
          await client.send(new sdk.AdminAddUserToGroupCommand({ UserPoolId: poolId, Username: username, GroupName }));
        } catch (error) {
          if (error.name !== 'ResourceNotFoundException') throw error;
          await client.send(new sdk.CreateGroupCommand({ UserPoolId: poolId, GroupName, Description: `Can edit ${GroupName.replace(/^site-/, '')}.` }));
          await client.send(new sdk.AdminAddUserToGroupCommand({ UserPoolId: poolId, Username: username, GroupName }));
        }
      }
      for (const GroupName of remove) {
        await client.send(new sdk.AdminRemoveUserFromGroupCommand({ UserPoolId: poolId, Username: username, GroupName }));
      }
    },

    async signOutEverywhere(poolId, username) {
      const { sdk, client } = await cognito();
      await client.send(new sdk.AdminUserGlobalSignOutCommand({ UserPoolId: poolId, Username: username }));
    },

    async disable(poolId, username) {
      const { sdk, client } = await cognito();
      await client.send(new sdk.AdminDisableUserCommand({ UserPoolId: poolId, Username: username }));
    },

    async enable(poolId, username) {
      const { sdk, client } = await cognito();
      await client.send(new sdk.AdminEnableUserCommand({ UserPoolId: poolId, Username: username }));
    },

    async remove(poolId, username) {
      const { sdk, client } = await cognito();
      await client.send(new sdk.AdminDeleteUserCommand({ UserPoolId: poolId, Username: username }));
    },
  };
}

/** Sends the access-request email; does nothing when no topic is set up. */
export function createAccessRequestNotifier({ topicArn = process.env.ACCESS_REQUEST_TOPIC } = {}) {
  return async ({ subject, message }) => {
    if (!topicArn) return false;
    const sdk = await import('@aws-sdk/client-sns');
    const client = new sdk.SNSClient({ region });
    await client.send(new sdk.PublishCommand({ TopicArn: topicArn, Subject: subject, Message: message }));
    return true;
  };
}
