import numpy as np
from cv2.typing import MatLike

from .tracker_aot import get_aot


class NutshTracker:
    def __init__(self, aot_args) -> None:
        """
        Initialize AOT.
        """
        self.tracker = get_aot(aot_args)  # self.tracker is a AOTTracker object
        self.reference_objs_list = []
        self.object_idx = 1
        self.curr_idx = 1
        self.origin_merged_mask = None  # init by segment-everything or update
        self.first_frame_mask = None

        # debug
        self.everything_points = []
        self.everything_labels = []

    def add_reference(self, frame: MatLike, mask: MatLike, frame_step: int = 0):
        """
        Add objects in a mask for tracking.
        Arguments:
            frame: numpy array (h,w,3)
            mask: numpy array (h,w)
        """
        self.reference_objs_list.append(np.unique(mask))  # [array([0,1,...N])]
        self.curr_idx = self.get_obj_num()  # int
        self.tracker.add_reference_frame(frame, mask, self.curr_idx, frame_step)
        self.first_frame_mask = mask

    def track(self, frame: MatLike, update_memory=False):
        """
        Track all known objects.
        Arguments:
            frame: numpy array (h,w,3)
        Return:
            origin_merged_mask: numpy array (h,w)
        """
        pred_mask = self.tracker.track(frame)
        if update_memory:
            self.tracker.update_memory(pred_mask)
        return pred_mask.squeeze(0).squeeze(0).detach().cpu().numpy().astype(np.uint8)

    def get_tracking_objs(self):
        objs = set()
        for ref in self.reference_objs_list:
            objs.update(set(ref))
        objs = list(sorted(list(objs)))
        objs = [i for i in objs if i != 0]
        return objs

    def get_obj_num(self):
        objs = self.get_tracking_objs()
        if len(objs) == 0:
            return 0
        return int(max(objs))

    def restart_tracker(self):
        self.tracker.restart()
