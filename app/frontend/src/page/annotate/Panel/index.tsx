import {FC} from 'react';
import {useParams} from 'react-router-dom';
import {YjsProvider} from 'common/yjs/context';
import {PanelLoad} from './Load';
import {useYjsListener} from 'common/yjs/event';

const Panel: FC = () => {
  const {videoId: id = ''} = useParams();
  if (!id) {
    return <div />;
  }

  return (
    <YjsProvider>
      <PanelLoad id={id} />
      <YjsListener />
    </YjsProvider>
  );
};

function YjsListener() {
  useYjsListener();
  return null;
}

export default Panel;
