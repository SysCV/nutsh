import {FC} from 'react';
import {useParams} from 'react-router-dom';
import {YjsProvider} from 'common/yjs/context';
import {PanelLoad} from './Load';

const Panel: FC = () => {
  const {videoId: id = ''} = useParams();
  if (!id) {
    return <div />;
  }

  return (
    <YjsProvider>
      <PanelLoad id={id} />
    </YjsProvider>
  );
};

export default Panel;
