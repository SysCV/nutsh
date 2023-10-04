import {createContext} from 'react';
import {useQuery, QueryClient} from '@tanstack/react-query';

const client = new QueryClient();
const context = createContext<QueryClient | undefined>(client);

const query = (u: string) => {
  let url = u;

  const localPrefix = 'file://';
  if (u.startsWith(localPrefix)) {
    url = `/local/${u.substring(localPrefix.length)}`;
  }

  return {
    queryKey: ['downloadImage', url],
    queryFn: async () => await (await fetch(url)).blob(),
  };
};

export const useDownloadImage = (url: string) => {
  const {queryKey, queryFn} = query(url);
  return useQuery(queryKey, queryFn, {context});
};

export const prefetchImages = (urls: string[]) => {
  urls.forEach(url => client.prefetchQuery(query(url)));
};
